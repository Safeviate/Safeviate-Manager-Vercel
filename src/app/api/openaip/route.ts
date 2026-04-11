import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.core.openaip.net/api';
const FALLBACK_OPENAIP_KEY = '1cbf7bdd18e52e7fa977c6d106847397';

async function readResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    const text = await response.text();
    return text || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource');
  const apiKey = process.env.OPENAIP_API_KEY || FALLBACK_OPENAIP_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAIP API key not configured on server' }, { status: 500 });
  }

  if (!resource) {
    return NextResponse.json({ error: 'Missing resource parameter' }, { status: 400 });
  }

  const query = new URLSearchParams(searchParams);
  query.delete('resource');
  query.set('apiKey', apiKey);

  try {
    const upstreamUrl = `${BASE_URL}/${resource}?${query.toString()}`;
    const response = await fetch(upstreamUrl, {
      headers: {
        'x-openaip-api-key': apiKey,
      },
    });

    const data = await readResponseBody(response);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'OpenAIP upstream request failed',
          upstreamStatus: response.status,
          upstreamStatusText: response.statusText,
          upstreamBody: data,
          url: upstreamUrl,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('OpenAIP proxy failed', error);
    return NextResponse.json(
      { error: 'OpenAIP proxy failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
