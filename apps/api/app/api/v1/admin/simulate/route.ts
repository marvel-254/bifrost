import { NextRequest, NextResponse } from 'next/server';
import { PolicyEngine, PolicySimulator, PolicyRegistry } from '@bifrost/policy';
import type { Policy } from '@bifrost/policy';
import type { NormalizedRequest } from '@bifrost/shared';

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
    const body = await request.json() as {
      policy?: Policy;
      yaml?: string;
      currentPolicy?: Policy;
      historicalRequests?: NormalizedRequest[];
      requestCount?: number;
    };

    let policy: Policy;
    if (body.yaml) {
      const engine = new PolicyEngine();
      const policies = engine.loadYaml(body.yaml);
      if (policies.length === 0) {
        return NextResponse.json({ error: { message: 'No policies found in YAML', type: 'validation_error' } }, { status: 400 });
      }
      policy = policies[0];
    } else if (body.policy) {
      policy = body.policy;
    } else {
      return NextResponse.json({ error: { message: 'Provide policy or yaml', type: 'validation_error' } }, { status: 400 });
    }

    const registry = new PolicyRegistry();
    if (body.currentPolicy) registry.registerPolicy(body.currentPolicy);
    const simulator = new PolicySimulator({ baselinePolicy: body.currentPolicy });

    const requests: NormalizedRequest[] = body.historicalRequests || generateMockRequests(body.requestCount || 100);
    const result = simulator.compareWithBaseline(policy, requests, body.currentPolicy);

    return NextResponse.json({ simulation: result });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Simulation failed', type: 'internal_error', details: String(err) } }, { status: 500 });
  }
}

function generateMockRequests(count: number): NormalizedRequest[] {
  const requests: NormalizedRequest[] = [];
  for (let i = 0; i < count; i++) {
    requests.push({
      model: i % 3 === 0 ? 'gpt-4' : i % 3 === 1 ? 'gpt-3.5-turbo' : 'claude-3',
      messages: [{ role: 'user', content: `Mock request ${i}` }],
      max_tokens: 1024,
      stream: i % 2 === 0,
      metadata: { tenant: `tenant-${i % 5}` },
    });
  }
  return requests;
}
