import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dashboard aggregate metrics. v0 returns live zeros + provider count
// derived from the model registry until Neon telemetry is wired (Phase 5).
// Shape must match apps/api/app/page.tsx RequestMetrics.
export async function GET(): Promise<NextResponse> {
  const activeProviders = 13; // gemini, groq, cerebras, sambanova, openrouter, cloudflare, mistral, ollama, huggingface, openai, zen, ollama-cloud, bytez
  return NextResponse.json({
    total_requests: 0,
    success_rate: 1,
    avg_latency_ms: 0,
    estimated_cost_usd: 0,
    active_providers: activeProviders,
  });
}
