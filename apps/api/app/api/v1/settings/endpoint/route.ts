import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.GATEWAY_URL || 'http://localhost:3000';

  return NextResponse.json({
    endpoint: `${baseUrl}/v1`,
    openai_compatible: true,
    usage: {
      base_url: `${baseUrl}/v1`,
      docs: `${baseUrl}/api/v1/models`,
      health: `${baseUrl}/api/health`,
    },
    examples: {
      curl: `curl ${baseUrl}/v1/chat/completions -H "Authorization: Bearer sk-bifrost-..." -H "Content-Type: application/json" -d '{"model":"auto","messages":[{"role":"user","content":"Hello"}]}'`,
      python: `from openai import OpenAI\nclient = OpenAI(base_url="${baseUrl}/v1", api_key="sk-bifrost-...")`,
      typescript: `const client = new OpenAI({ baseURL: "${baseUrl}/v1", apiKey: "sk-bifrost-..." })`,
    },
  });
}
