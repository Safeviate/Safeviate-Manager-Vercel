import { NextResponse } from 'next/server';
import { flowRegistry, type RegisteredFlowName } from '@/ai/flow-registry';
import { authenticateAiRequest, isAuthorizedForAiFlow } from '@/lib/server/ai-auth';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    flow: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  return NextResponse.json(
    { ok: false, error: 'Method not allowed.' },
    { status: 405 }
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') || host?.includes('127.0.0.1') ? 'http' : 'https');
  const expectedOrigin = host ? `${protocol}://${host}` : new URL(request.url).origin;
  
  const origin = request.headers.get('origin');
  if (origin && origin !== expectedOrigin) {
    return NextResponse.json(
      { ok: false, error: 'Forbidden origin.' },
      { status: 403 }
    );
  }

  const { flow } = await params;
  const definition = flowRegistry[flow as RegisteredFlowName];

  if (!definition) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown AI flow: ${flow}`,
      },
      { status: 404 }
    );
  }

  const authResult = await authenticateAiRequest(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { ok: false, error: authResult.error },
      { status: authResult.status }
    );
  }

  if (!isAuthorizedForAiFlow(flow, authResult.userProfile, authResult.effectivePermissions)) {
    return NextResponse.json(
      { ok: false, error: 'You do not have permission to run this AI flow.' },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const validation = definition.inputSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid input for AI flow.',
        issues: validation.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const result = await definition.run(validation.data as any);
    return NextResponse.json({ ok: true, flow, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'AI flow execution failed.';

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
