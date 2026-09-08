import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  const apiKey = process.env.API_KEY || 'dev-key-change-in-production';
  if (apiKey && auth !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }

  return NextResponse.json({
    object: 'list',
    data: [
      { id: 'llama3', object: 'model', created: 1700000000, owned_by: 'ollama', permission: [{ id: 'llama3-perm', object: 'modelPermission', created: 1700000000, allow_sampling: true, allow_usage: true, is_active: true, name: 'main' }] },
      { id: 'mistral', object: 'model', created: 1700000000, owned_by: 'ollama', permission: [{ id: 'mistral-perm', object: 'modelPermission', created: 1700000000, allow_sampling: true, allow_usage: true, is_active: true, name: 'main' }] },
      { id: 'llama3.1', object: 'model', created: 1700000000, owned_by: 'ollama', permission: [{ id: 'llama3.1-perm', object: 'modelPermission', created: 1700000000, allow_sampling: true, allow_usage: true, is_active: true, name: 'main' }] },
      { id: 'gemma2', object: 'model', created: 1700000000, owned_by: 'ollama', permission: [{ id: 'gemma2-perm', object: 'modelPermission', created: 1700000000, allow_sampling: true, allow_usage: true, is_active: true, name: 'main' }] },
    ],
    total: 4,
  });
}
