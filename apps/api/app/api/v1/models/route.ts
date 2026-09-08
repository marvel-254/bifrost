import { NextRequest, NextResponse } from 'next/server';
import { createSeedRegistry } from '@bifrost/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getModelRegistry() {
  return createSeedRegistry();
}

// ── Routes ─────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const models = getModelRegistry();
  const allModels = models.listModels();

  return NextResponse.json({
    object: 'list',
    data: allModels.map(m => ({
      id: m.id,
      object: 'model',
      created: 1700000000,
      owned_by: m.provider,
      provider: m.provider,
      display_name: m.displayName,
      context_window: m.contextWindow,
      capabilities: m.capabilities,
      pricing: { input: m.inputPrice, output: m.outputPrice },
    })),
    total: allModels.length,
  });
}
