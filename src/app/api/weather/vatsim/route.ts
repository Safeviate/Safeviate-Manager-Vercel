import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for VATSIM METAR API
 * No API key required. Reliable global raw METAR data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const icao = searchParams.get('icao');

  if (!icao) {
    return NextResponse.json({ error: 'Missing station ICAO' }, { status: 400 });
  }

  try {
    const url = `https://metar.vatsim.net/metar.php?id=${icao.toUpperCase()}`;
    const response = await fetch(url, {
        next: { revalidate: 300 } // 5 min cache
    });
    
    if (!response.ok) {
        throw new Error(`VATSIM API returned ${response.status}`);
    }

    const raw = await response.text();
    
    if (!raw || raw.trim().length < 5) {
        return NextResponse.json({ error: 'No data returned from VATSIM' }, { status: 404 });
    }

    return NextResponse.json({ 
        raw,
        source: 'VATSIM',
        timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('VATSIM Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data from VATSIM' }, { status: 500 });
  }
}
