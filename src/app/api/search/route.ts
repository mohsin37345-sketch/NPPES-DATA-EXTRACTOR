import { NextRequest } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const NPPES_URL = 'https://npiregistry.cms.hhs.gov/api/';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { state, npiType, taxonomy } = body;

  // Resolve enumeration type
  let enumType = '';
  const rawType = (npiType || '').trim().toLowerCase();
  if (rawType.includes('2') || rawType === 'organization') enumType = 'NPI-2';
  else if (rawType.includes('1') || rawType === 'individual') enumType = 'NPI-1';

  const base: Record<string, string> = { version: '2.1', limit: '200' };
  if (state) base.state = state.trim().toUpperCase();
  if (enumType) base.enumeration_type = enumType;
  if (taxonomy) base.taxonomy_description = taxonomy.trim();

  // Determine what parameters we are iterating on (AA-ZZ)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const prefixes: string[] = [];
  for (const a of alphabet) {
    for (const b of alphabet) {
      prefixes.push(a + b);
    }
  }

  const fieldsToScan: string[] = [];
  if (enumType === 'NPI-2') fieldsToScan.push('organization_name');
  else if (enumType === 'NPI-1') fieldsToScan.push('last_name');
  else {
    // If "Any", must scan both individual and organization name fields block by block
    fieldsToScan.push('organization_name');
    fieldsToScan.push('last_name');
  }

  const encoder = new TextEncoder();
  const seen = new Set<string>();

  // Stream results page-by-page as NDJSON (one JSON line per page)
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (const field of fieldsToScan) {
          for (const prefix of prefixes) {
            // Tell the client which prefix we are currently scanning
            const fieldLabel = field === 'last_name' ? 'Last Name' : 'Organization Name';
            controller.enqueue(encoder.encode(JSON.stringify({ progress: `Scanning ${fieldLabel}: ${prefix}*` }) + '\n'));

            let skip = 0;

            while (true) {
              const res = await axios.get(NPPES_URL, {
                params: { ...base, [field]: prefix + '*', skip: String(skip) },
                timeout: 8000,
              });

              const page: any[] = Array.isArray(res.data?.results) ? res.data.results : [];
              if (page.length === 0) break;

              const batch: any[] = [];
              for (const item of page) {
                const npi = String(item.number || '').trim();
                if (!npi || seen.has(npi)) continue;
                seen.add(npi);

                const basic = item.basic || {};
                const tax = item.taxonomies?.find((t: any) => t.primary === true) ?? item.taxonomies?.[0];
                const addr = item.addresses?.find((a: any) => a.address_purpose === 'LOCATION') ?? item.addresses?.[0];

                batch.push({
                  'NPI Number': npi,
                  'Enumeration Date': basic.enumeration_date || '',
                  'Organization Name': basic.organization_name || '',
                  'First Name': basic.authorized_official_first_name || basic.first_name || '',
                  'Last Name': basic.authorized_official_last_name || basic.last_name || '',
                  'Title/Position': basic.authorized_official_title_or_position || '',
                  'Phone Number': basic.authorized_official_telephone_number || addr?.telephone_number || '',
                  'State': addr?.state || '',
                  'NPI Type': item.enumeration_type || '',
                  'Taxonomy': tax?.desc || '',
                });
              }

              if (batch.length > 0) {
                // Send this batch as one NDJSON line
                controller.enqueue(encoder.encode(JSON.stringify(batch) + '\n'));
              } else {
                // Send pure keep-alive so Render's 30s timeout doesn't drop the connection
                controller.enqueue(encoder.encode('\n'));
              }

              if (page.length < 200) break; // Finished this 2-letter prefix

              skip += 200;
              // Failsafe: if somehow a 2-letter prefix in 1 state exceeds 1200 records, skip it
              if (skip > 1000) break;
              
              await new Promise(r => setTimeout(r, 100)); // Delay between pages
            }
            
            // Small pause between each letter of the alphabet to be polite to CMS servers
            await new Promise(r => setTimeout(r, 20));
          }
        }
      } catch (err: any) {
        // On error, send an error line so client knows (only if not already caught by something else)
        const msg = err?.response?.data?.Errors?.[0]?.description || err?.message || 'API error';
        controller.enqueue(encoder.encode(JSON.stringify({ error: msg }) + '\n'));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no', // Disables Nginx buffering on Render
    },
  });
}
