import { NextRequest, NextResponse } from 'next/server';
import { getAllProviderKeys, addProviderKey, deleteProviderKey, updateProviderKey } from '../../../../../../../packages/shared/src/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function checkAuth(request: NextRequest): boolean {
  const key = process.env.API_KEY;
  if (!key) return true;
  return request.headers.get('authorization') === `Bearer ${key}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }
  try {
    const keys = await getAllProviderKeys();
    const safe = keys.map(k => ({
      ...k,
      api_key: `...${k.api_key.slice(-4)}`,
    }));
    return NextResponse.json(safe);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('providers GET error:', msg);
    return NextResponse.json({ error: { message: 'Failed to load provider keys', type: 'internal_error', detail: msg } }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }
  try {
    const body = await request.json() as { provider: string; api_key: string; label?: string; priority?: number };
    if (!body.provider || !body.api_key) {
      return NextResponse.json({ error: { message: 'Missing provider or api_key', type: 'invalid_request_error' } }, { status: 400 });
    }
    const key = await addProviderKey(body);
    if (!key) {
      return NextResponse.json({ error: { message: 'Failed to add key (DB unavailable?)', type: 'internal_error' } }, { status: 500 });
    }
    return NextResponse.json({ ...key, api_key: `...${key.api_key.slice(-4)}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('providers POST error:', msg);
    return NextResponse.json({ error: { message: 'Failed to add provider key', type: 'internal_error', detail: msg } }, { status: 500 });
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
    await deleteProviderKey(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to delete provider key', type: 'internal_error' } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }
  try {
    const body = await request.json() as { id: string; api_key?: string; label?: string; enabled?: boolean; priority?: number };
    if (!body.id) {
      return NextResponse.json({ error: { message: 'Missing id', type: 'invalid_request_error' } }, { status: 400 });
    }
    const { id, ...updates } = body;
    const key = await updateProviderKey(id, updates);
    if (!key) {
      return NextResponse.json({ error: { message: 'Key not found', type: 'not_found' } }, { status: 404 });
    }
    return NextResponse.json({ ...key, api_key: `...${key.api_key.slice(-4)}` });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to update provider key', type: 'internal_error' } }, { status: 500 });
  }
}
