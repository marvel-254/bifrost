import { NextRequest, NextResponse } from 'next/server';
import { runWhatIfSimulation } from '../../../../../imports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { config: Record<string, unknown>; datasetId: string };
    if (!body.config || !body.datasetId) {
      return NextResponse.json({ error: { message: 'Missing config or datasetId', type: 'validation_error' } }, { status: 400 });
    }
    const result = await runWhatIfSimulation(body.config as any, body.datasetId);
    if (!result) {
      return NextResponse.json({ error: { message: 'Dataset not found', type: 'not_found' } }, { status: 404 });
    }
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Simulation failed', type: 'internal_error' } }, { status: 500 });
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ error: { message: 'Method not allowed', type: 'method_not_allowed' } }, { status: 405 });
}
