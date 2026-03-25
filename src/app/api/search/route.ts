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

  const encoder = new TextEncoder();
  const seen = new Set<string>();
  let skip = 0;

  // Stream results page-by-page as NDJSON (one JSON line per page)
  // This keeps the connection alive and bypasses Render's 30s gateway timeout
  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const res = await axios.get(NPPES_URL, {
            params: { ...base, skip: String(skip) },
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
            // Send this batch as one NDJSON line — client receives it immediately
            controller.enqueue(encoder.encode(JSON.stringify(batch) + '\n'));
          }

          if (page.length < 200) break; // Last page

          skip += 200;
          await new Promise(r => setTimeout(r, 100)); // Polite delay
        }
      } catch (err: any) {
        // On error, send an error line so client knows
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
