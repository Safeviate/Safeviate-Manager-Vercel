import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const icao = searchParams.get('icao');

  if (!icao) {
    return NextResponse.json({ error: 'Missing station ICAO' }, { status: 400 });
  }

  try {
    // Note: This requires a CheckWX API key.
    const apiKey = process.env.CHECKWX_API_KEY;
    
    // CheckWX's decoded METAR endpoint:
    const url = `https://api.checkwx.com/metar/${icao.toUpperCase()}/decoded`;
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey || ''
      }
    });
    
    if (!response.ok) {
        if (response.status === 401) {
            return NextResponse.json({ error: 'CheckWX API Key required or invalid' }, { status: 401 });
        }
        throw new Error(`CheckWX API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('CheckWX Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data from CheckWX' }, { status: 500 });
  }
}
