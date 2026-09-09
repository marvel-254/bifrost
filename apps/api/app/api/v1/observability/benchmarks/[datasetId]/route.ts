import { NextRequest, NextResponse } from 'next/server';
import { getBenchmarkById, getBenchmarkResultsByDataset } from '../../../../../../imports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ datasetId: string }> }
): Promise<NextResponse> {
  try {
    const { datasetId } = await params;
    const dataset = await getBenchmarkById(datasetId);
    if (!dataset) {
      return NextResponse.json({ error: { message: 'Benchmark dataset not found', type: 'not_found' } }, { status: 404 });
    }
    const results = await getBenchmarkResultsByDataset(datasetId);
    return NextResponse.json({ dataset, results });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to fetch benchmark', type: 'internal_error' } }, { status: 500 });
  }
}

export async function POST(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ error: { message: 'Method not allowed', type: 'method_not_allowed' } }, { status: 405 });
}
