import { NextRequest, NextResponse } from 'next/server';
import { getShadowComparisonResults } from '../../../../../imports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
    const results = await getShadowComparisonResults({ provider, limit });
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to fetch shadow results', type: 'internal_error' } }, { status: 500 });
  }
}

export async function POST(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ error: { message: 'Method not allowed', type: 'method_not_allowed' } }, { status: 405 });
}
