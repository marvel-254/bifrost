import { NextRequest, NextResponse } from 'next/server';
import { getAllGatewayKeys, createGatewayKey, deleteGatewayKey } from '../../../../../../../packages/shared/src/db';
import { createHash, randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function checkAuth(request: NextRequest): boolean {
  const key = process.env.API_KEY;
  if (!key) return true;
  return request.headers.get('authorization') === `Bearer ${key}`;
}

function generateKey(): string {
  const bytes = randomBytes(32);
  return `sk-bifrost-${bytes.toString('hex')}`;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }
  try {
    const keys = await getAllGatewayKeys();
    return NextResponse.json(keys);
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to load gateway keys', type: 'internal_error' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }
  try {
    const body = await request.json() as { name?: string; tier?: string; rate_limit_rpm?: number; daily_limit_tokens?: number; monthly_limit_cost?: number };
    const rawKey = generateKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 20) + '...';

    const created = await createGatewayKey({
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: body.name || 'Unnamed Key',
      tier: body.tier,
      rate_limit_rpm: body.rate_limit_rpm,
      daily_limit_tokens: body.daily_limit_tokens,
      monthly_limit_cost: body.monthly_limit_cost,
    });

    // Return the raw key ONCE — it can't be retrieved again
    // If DB is unavailable, still return the key (in-memory only)
    if (!created) {
      return NextResponse.json({ raw_key: rawKey, key_prefix: keyPrefix, name: body.name || 'Unnamed Key', note: 'DB unavailable - key not persisted' });
    }
    return NextResponse.json({ ...created, raw_key: rawKey });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to create gateway key', type: 'internal_error' } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: { message: 'Missing id', type: 'invalid_request_error' } }, { status: 400 });
    }
    await deleteGatewayKey(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to delete gateway key', type: 'internal_error' } }, { status: 500 });
  }
}
