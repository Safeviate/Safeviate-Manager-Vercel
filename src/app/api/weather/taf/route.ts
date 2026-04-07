import { NextRequest, NextResponse } from 'next/server';

async function parseTafResponse(response: Response, ids: string) {
  try {
    const raw = await response.text();

    if (!raw.trim()) {
      console.warn(`[TAF Proxy] Empty NOAA response for ${ids}`);
      return null;
    }

    const payload = JSON.parse(raw);

    if (!Array.isArray(payload)) {
      console.warn(`[TAF Proxy] Unexpected NOAA payload for ${ids}`);
      return null;
    }

    return payload;
  } catch (error: any) {
    console.warn(`[TAF Proxy] Failed to parse NOAA response for ${ids}: ${error.message}`);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return NextResponse.json({ error: 'Missing station IDs' }, { status: 400 });
  }

  try {
    const url = `https://aviationweather.gov/api/data/taf?ids=${ids.toUpperCase()}&format=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NOAA API returned ${response.status}`);
    }

    const data = await parseTafResponse(response, ids.toUpperCase());

    if (!data) {
      return NextResponse.json({ error: `No TAF data found for station ${ids.toUpperCase()}` }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('TAF Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch TAF data from NOAA' }, { status: 500 });
  }
}
