import { NextRequest, NextResponse } from 'next/server';
import { searchNPPESList } from '@/lib/nppes';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { state, npiType, taxonomy } = body;

    const results = await searchNPPESList({ state, npiType, taxonomyDescription: taxonomy });

    if (results.length === 0) {
      return NextResponse.json({ error: 'No results found.' }, { status: 404 });
    }

    return NextResponse.json({ results });

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message || 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
