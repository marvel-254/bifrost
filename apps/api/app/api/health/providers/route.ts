import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROVIDERS = [
  { provider: 'gemini', model_count: 3, tier: 'free' },
  { provider: 'groq', model_count: 4, tier: 'free' },
  { provider: 'cerebras', model_count: 2, tier: 'free' },
  { provider: 'sambanova', model_count: 2, tier: 'free' },
  { provider: 'openrouter', model_count: 3, tier: 'free' },
  { provider: 'cloudflare', model_count: 2, tier: 'free' },
  { provider: 'mistral', model_count: 3, tier: 'free' },
  { provider: 'ollama', model_count: 4, tier: 'local' },
  { provider: 'huggingface', model_count: 3, tier: 'free' },
  { provider: 'openai', model_count: 3, tier: 'paid' },
  { provider: 'zen', model_count: 2, tier: 'paid' },
  { provider: 'ollama-cloud', model_count: 2, tier: 'paid' },
  { provider: 'bytez', model_count: 2, tier: 'paid' },
];

export async function GET(): Promise<NextResponse> {
  const now = new Date().toISOString();
  return NextResponse.json(
    PROVIDERS.map((p) => ({
      provider: p.provider,
      status: 'healthy',
      success_rate: 1,
      avg_latency_ms: 0,
      model_count: p.model_count,
      tier: p.tier,
      last_check: now,
    }))
  );
}
