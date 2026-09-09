import { NextRequest, NextResponse } from 'next/server';
import { tenantManager } from '@bifrost/policy';

function checkAuth(request: NextRequest): boolean {
  const key = process.env.API_KEY;
  if (!key) return true;
  return request.headers.get('authorization') === `Bearer ${key}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!checkAuth(_request)) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }
  try {
    const { id } = await params;
    const config = tenantManager.getTenantConfig(id);
    return NextResponse.json({ tenant: config });
  } catch {
    return NextResponse.json({ error: { message: 'Failed to load tenant', type: 'internal_error' } }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const config = tenantManager.updateTenantConfig(id, body as never);
    return NextResponse.json({ tenant: config });
  } catch {
    return NextResponse.json({ error: { message: 'Failed to update tenant', type: 'internal_error' } }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!checkAuth(_request)) {
    return NextResponse.json({ error: { message: 'Unauthorized', type: 'authentication_error' } }, { status: 401 });
  }
  try {
    const { id } = await params;
    const deleted = tenantManager.deleteTenant(id);
    return NextResponse.json({ deleted });
  } catch {
    return NextResponse.json({ error: { message: 'Failed to delete tenant', type: 'internal_error' } }, { status: 500 });
  }
}
