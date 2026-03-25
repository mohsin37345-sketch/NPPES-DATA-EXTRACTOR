import { NextRequest, NextResponse } from 'next/server';
import { buildOutputExcel } from '@/lib/excel';

export async function POST(req: NextRequest) {
  try {
    const { results } = await req.json();

    if (!results || results.length === 0) {
       return NextResponse.json({ error: 'No data to export' }, { status: 400 });
    }

    const outputBuffer = await buildOutputExcel(results);

    const response = new NextResponse(outputBuffer as any);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', 'attachment; filename="NPPES_Search_Results.xlsx"');

    return response;

  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error.message || 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
