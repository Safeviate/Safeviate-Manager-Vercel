import { NextResponse } from 'next/server';
import { flowRegistry, type RegisteredFlowName } from '@/ai/flow-registry';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    flow: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { flow } = await params;
  const definition = flowRegistry[flow as RegisteredFlowName];

  if (!definition) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown AI flow: ${flow}`,
        availableFlows: Object.keys(flowRegistry),
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    flow,
    availableFlows: Object.keys(flowRegistry),
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { flow } = await params;
  const definition = flowRegistry[flow as RegisteredFlowName];

  if (!definition) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown AI flow: ${flow}`,
        availableFlows: Object.keys(flowRegistry),
      },
      { status: 404 }
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
