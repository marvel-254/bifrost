import { NextRequest, NextResponse } from 'next/server';
import { listTraces } from '../../../../../imports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters: Record<string, string | number> = {};
    for (const [key, value] of searchParams.entries()) {
      const num = Number(value);
      filters[key] = Number.isNaN(num) ? value : num;
    }
    const traces = await listTraces(filters);
    return NextResponse.json({ traces });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to fetch traces', type: 'internal_error' } }, { status: 500 });
  }
}

export async function POST(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ error: { message: 'Method not allowed', type: 'method_not_allowed' } }, { status: 405 });
}
