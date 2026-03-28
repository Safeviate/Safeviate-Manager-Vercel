import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const icao = searchParams.get('icao');

  if (!icao) {
    return NextResponse.json({ error: 'Missing station ICAO' }, { status: 400 });
  }

  try {
    // Note: This requires an AVWX API token if you want to use it in production.
    // We are setting it up so it's ready for that token.
    const token = process.env.AVWX_API_TOKEN;
    
    const url = `https://avwx.rest/api/metar/${icao.toUpperCase()}?options=summary,translate&format=json`;
    const response = await fetch(url, {
      headers: {
        'Authorization': token ? `BEARER ${token}` : ''
      }
    });
    
    if (!response.ok) {
        // If AVWX fails (e.g. no token), we return a specific error
        if (response.status === 401) {
            return NextResponse.json({ error: 'AVWX API Token required or invalid' }, { status: 401 });
        }
        throw new Error(`AVWX API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('AVWX Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data from AVWX' }, { status: 500 });
  }
}
