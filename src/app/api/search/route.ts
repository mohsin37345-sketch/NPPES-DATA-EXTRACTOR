import { NextRequest, NextResponse } from 'next/server';
import { searchNPPESList } from '@/lib/nppes';
import { buildOutputExcel } from '@/lib/excel';

export const maxDuration = 60; // Allow up to 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { state, npiType, taxonomy, limit } = body;

    const results = await searchNPPESList({
      state,
      npiType,
      taxonomyDescription: taxonomy,
      limit: limit || 200
    });

    if (results.length === 0) {
      return NextResponse.json({ error: 'No results found.' }, { status: 404 });
    }

    try {
      return NextResponse.json({ results });
    } catch (jsonErr: any) {
      // If JSON serialization fails (e.g. body too large), return a subset
      return NextResponse.json(
        { error: `Result set too large to return (${results.length} rows). Try narrowing your search filters.` },
        { status: 413 }
      );
    }

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message || 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
