import { NextRequest, NextResponse } from 'next/server';
import { flowRegistry, type RegisteredFlowName } from '@/ai/flow-registry';
import { authenticateAiRequest, isAuthorizedForAiFlow } from '@/lib/server/ai-auth';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    flow: string;
  }>;
};

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');

  // In a production environment, you should lock this down to your specific frontend domain
  const allowedOrigin = origin || '*'; // Allow any origin for now, adjust for production

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(_: NextRequest, { params }: RouteContext) {
  return new NextResponse(
    JSON.stringify({ ok: false, error: 'Method not allowed.' }),
    { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    }
  );
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  // In a production environment, you should lock this down to your specific frontend domain
  const allowedOrigin = origin || '*'; 

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const { flow } = await params;
  const definition = flowRegistry[flow as RegisteredFlowName];

  if (!definition) {
    return new NextResponse(
      JSON.stringify({ ok: false, error: `Unknown AI flow: ${flow}` }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const authResult = await authenticateAiRequest();
  if (!authResult.ok) {
    return new NextResponse(
      JSON.stringify({ ok: false, error: authResult.error }),
      { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!isAuthorizedForAiFlow(flow, authResult.userProfile, authResult.effectivePermissions)) {
    return new NextResponse(
      JSON.stringify({ ok: false, error: 'You do not have permission to run this AI flow.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new NextResponse(
      JSON.stringify({ ok: false, error: 'Invalid JSON body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const validation = definition.inputSchema.safeParse(body);

  if (!validation.success) {
    return new NextResponse(
      JSON.stringify({ ok: false, error: 'Invalid input for AI flow.', issues: validation.error.flatten() }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await definition.run(validation.data as any);
    return new NextResponse(
        JSON.stringify({ ok: true, flow, result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'AI flow execution failed.';

    return new NextResponse(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
