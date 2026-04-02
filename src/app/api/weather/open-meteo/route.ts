import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for Open-Meteo API
 * Provides current ground conditions (Wind, Temp, Pressure) for any coordinates.
 * No API key required for non-commercial/low-volume use.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
  }

  try {
    // Current weather only
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,visibility&forecast_days=1&wind_speed_unit=kn`;
    
    const response = await fetch(url, {
        next: { revalidate: 900 } // 15 min cache
    });
    
    if (!response.ok) {
        throw new Error(`Open-Meteo API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Open-Meteo Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data from Open-Meteo' }, { status: 500 });
  }
}
