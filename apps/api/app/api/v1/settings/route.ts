import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, setSetting } from '../../../../../../packages/shared/src/db';

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
    const settings = await getAllSettings();
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to load settings', type: 'internal_error' } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }
  try {
    const body = await request.json() as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      await setSetting(key, value);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Failed to save settings', type: 'internal_error' } }, { status: 500 });
  }
}
