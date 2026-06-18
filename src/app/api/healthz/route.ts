import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'safeviate-manager',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
