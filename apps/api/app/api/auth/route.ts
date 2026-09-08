import { NextRequest, NextResponse } from 'next/server';
import { getGatewayKeyByHash } from '../../../../../packages/shared/src/db';
import { createHash } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { api_key: string };
    if (!body.api_key) {
      return NextResponse.json({ error: { message: 'Missing api_key', type: 'invalid_request_error' } }, { status: 400 });
    }

    const keyHash = hashKey(body.api_key);
    const key = await getGatewayKeyByHash(keyHash);

    if (!key) {
      return NextResponse.json({ valid: false, error: 'Invalid API key' });
    }

    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'API key expired' });
    }

    return NextResponse.json({
      valid: true,
      key: {
        id: key.id,
        name: key.name,
        tier: key.tier,
        rate_limit_rpm: key.rate_limit_rpm,
        daily_limit_tokens: key.daily_limit_tokens,
        monthly_limit_cost: key.monthly_limit_cost,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Auth check failed', type: 'internal_error' } }, { status: 500 });
  }
}
