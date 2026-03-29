import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return NextResponse.json({ error: 'Missing station IDs' }, { status: 400 });
  }

  try {
    // Note: In a real environment, you'd use a more specific aviation weather API.
    // For this prototype, we're using the public NOAA aviation weather data service.
    const url = `https://aviationweather.gov/api/data/metar?ids=${ids}&format=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NOAA API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Weather Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data from NOAA' }, { status: 500 });
  }
}
