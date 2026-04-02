import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for MET Norway (Norwegian Meteorological Institute)
 * Excellent for global forecast data based on coordinates.
 * No API key required, but requires a unique User-Agent.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
  }

  try {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'SafeviateFlightManager (https://safeviate.com/)'
        },
        next: { revalidate: 3600 } // 1 hour cache (standard for MET Norway)
    });
    
    if (!response.ok) {
        throw new Error(`MET Norway API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('MET Norway Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data from MET Norway' }, { status: 500 });
  }
}
