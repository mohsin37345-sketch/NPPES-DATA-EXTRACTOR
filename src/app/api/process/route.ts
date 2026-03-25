import { NextRequest, NextResponse } from 'next/server';
import { parseExcelData, buildOutputExcel } from '@/lib/excel';
import { queryNPPES } from '@/lib/nppes';

export const maxDuration = 60; // Allow up to 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read the file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Parse Excel data
    let inputRows: any[] = [];
    try {
      inputRows = await parseExcelData(buffer);
    } catch (e: any) {
      return NextResponse.json({ error: 'Failed to parse file. Ensure it is a valid Excel or CSV. ' + e.message }, { status: 400 });
    }

    if (inputRows.length === 0) {
       return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 });
    }

    // Helper: find column by fuzzy name
    const getVal = (row: any, searchNames: string[]) => {
      const keys = Object.keys(row);
      for (const sn of searchNames) {
        const foundKey = keys.find(k => k.toLowerCase().trim() === sn.toLowerCase());
        if (foundKey) return String(row[foundKey]);
      }
      return '';
    };

    // 2. Process each row
    const enrichedRows = [];
    let count = 0;
    
    for (const row of inputRows) {
      count++;
      
      // Attempt to map columns (flexible mapping)
      const state = getVal(row, ['state', 'provider_state', 'st']);
      const npiType = getVal(row, ['npi type', 'npitype', 'npi_type', 'type']);
      const taxonomyDesc = getVal(row, ['taxonomy description', 'taxonomy_description', 'taxonomy', 'specialty']);

      // Call NPPES API
      const result = await queryNPPES({
        state,
        npiType,
        taxonomyDescription: taxonomyDesc
      });

      // Combine original row with new extracted columns
      const combinedRow = {
        ...row,
        '---': '', // Visual separator
        'Extracted NPI Number': result.npi_number,
        'Extracted Enumeration Date': result.enumeration_date,
        'Extracted Org Name': result.organization_name,
        'Extracted Auth First Name': result.auth_first_name,
        'Extracted Auth Last Name': result.auth_last_name,
        'Extracted Auth Title': result.auth_title,
        'Extracted Auth Phone': result.auth_phone,
        'Matched State': result.matched_state,
        'Matched NPI Type': result.matched_npi_type,
        'Matched Taxonomy': result.matched_taxonomy,
        'Match Status': result.match_status,
        'Error': result.error_message || ''
      };

      enrichedRows.push(combinedRow);
    }

    // 3. Generate Output Excel
    const outputBuffer = await buildOutputExcel(enrichedRows);

    // 4. Send back as file download
    const response = new NextResponse(outputBuffer as any);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', 'attachment; filename="NPPES_Extracted_Results.xlsx"');

    return response;

  } catch (error: any) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error.message || 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
