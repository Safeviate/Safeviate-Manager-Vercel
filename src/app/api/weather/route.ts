import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for aviationweather.gov (NOAA)
 * This does NOT require an API key for basic METAR/TAF data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return NextResponse.json({ error: 'Missing station IDs' }, { status: 400 });
  }

  const icao = ids.toUpperCase();
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  };

  try {
    console.log(`[Weather API] Fetching METAR/TAF for: ${icao}`);
    
    // Fetch METAR and TAF in parallel
    const [metarRes, tafRes] = await Promise.all([
      fetch(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`, { 
        headers,
        next: { revalidate: 300 } 
      }),
      fetch(`https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`, { 
        headers,
        next: { revalidate: 300 } 
      })
    ]);

    let metar = null;
    let taf = null;

    if (metarRes.ok) {
        const metarData = await metarRes.json();
        metar = Array.isArray(metarData) ? (metarData[0] || null) : null;
    } else {
        console.warn(`[Weather API] METAR fetch failed for ${icao}: ${metarRes.status}`);
    }

    if (tafRes.ok) {
        const tafData = await tafRes.json();
        taf = Array.isArray(tafData) ? (tafData[0] || null) : null;
    } else {
        console.warn(`[Weather API] TAF fetch failed for ${icao}: ${tafRes.status}`);
    }

    if (!metar && !taf) {
        return NextResponse.json({ error: `No weather data found for station ${icao}` }, { status: 404 });
    }

    return NextResponse.json({ metar, taf });
  } catch (error: any) {
    console.error('[Weather API] Proxy Error:', error);
    return NextResponse.json({ error: 'Aviation Weather service error', details: error.message }, { status: 500 });
  }
}
