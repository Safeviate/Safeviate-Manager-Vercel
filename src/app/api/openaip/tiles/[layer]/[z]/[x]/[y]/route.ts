import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_OPENAIP_KEY = '1cbf7bdd18e52e7fa977c6d106847397';

type Params = {
  params: {
    layer: string;
    z: string;
    x: string;
    y: string;
  };
};

export async function GET(_request: NextRequest, context: { params: Promise<Params['params']> }) {
  const { layer, z, x, y } = await context.params;
  const apiKey = process.env.OPENAIP_API_KEY || FALLBACK_OPENAIP_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAIP API key not configured on server' }, { status: 500 });
  }

  // All OpenAIP tiles are served from the same endpoint structure.
  // The 'layer' parameter directly maps to the path on the tile server.
  const subdomains = ['a', 'b', 'c'];
  const subdomainIndex = (Number(z) + Number(x) + Number(y)) % subdomains.length;
  const subdomain = subdomains[subdomainIndex];
  const upstreamUrl = `https://${subdomain}.api.tiles.openaip.net/api/data/${layer}/${z}/${x}/${y}.png?apiKey=${apiKey}`;

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      next: { revalidate: 3600 }, // Cache tiles for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'OpenAIP tile request failed', status: response.status, url: upstreamUrl },
        { status: response.status }
      );
    }

    const imageBuffer = await response.arrayBuffer();
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'content-type': response.headers.get('content-type') || 'image/png',
        'cache-control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'OpenAIP tile proxy failed', details: error?.message || 'Unknown error' }, { status: 500 });
  }
}
