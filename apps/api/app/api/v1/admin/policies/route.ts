import { NextRequest, NextResponse } from 'next/server';
import { PolicyEngine } from '@bifrost/policy';

const engine = new PolicyEngine();

function checkAuth(request: NextRequest): boolean {
  const key = process.env.API_KEY;
  if (!key) return true;
  return request.headers.get('authorization') === `Bearer ${key}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }
  try {
    const body = await request.json() as { yaml?: string; policy?: Record<string, unknown> };
    if (body.yaml) {
      const policies = engine.loadYaml(body.yaml);
      for (const p of policies) engine.registerPolicy(p);
      return NextResponse.json({ ok: true, policies });
    }
    if (body.policy) {
      engine.registerPolicy(body.policy as never);
      return NextResponse.json({ ok: true, policy: body.policy });
    }
    return NextResponse.json({ error: { message: 'Provide yaml or policy', type: 'validation_error' } }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to create policy', type: 'internal_error' } }, { status: 500 });
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const policies = engine.listPolicies();
    return NextResponse.json({ policies });
  } catch {
    return NextResponse.json({ error: { message: 'Failed to list policies', type: 'internal_error' } }, { status: 500 });
  }
}
