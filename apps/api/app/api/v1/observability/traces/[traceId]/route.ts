import { NextRequest, NextResponse } from 'next/server';
import { getTrace, listTraces } from '../../../../../../imports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
): Promise<NextResponse> {
  try {
    const { traceId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const filters: Record<string, string | number> = {};
    for (const [key, value] of searchParams.entries()) {
      const num = Number(value);
      filters[key] = Number.isNaN(num) ? value : num;
    }

    const data = await getTrace(traceId, filters);
    if (!data.trace) {
      return NextResponse.json({ error: { message: 'Trace not found', type: 'not_found' } }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to fetch trace', type: 'internal_error' } }, { status: 500 });
  }
}

export async function POST(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ error: { message: 'Method not allowed', type: 'method_not_allowed' } }, { status: 405 });
}
