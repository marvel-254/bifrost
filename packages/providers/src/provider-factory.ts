/**
 * Provider factory that creates provider instances with key rotation.
 * Reads keys from the database and creates a rotator per provider.
 */

import { KeyRotator, type RotatableKey, type RotationStrategy } from './key-rotation';
import { getProviderKeys } from '@bifrost/shared';
import { createGeminiProvider } from './gemini';
import { createGroqProvider } from './groq';
import { createCerebrasProvider } from './cerebras';
import { createSambaNovaProvider } from './sambanova';
import { createOpenRouterProvider } from './openrouter';
import { createCloudflareProvider } from './cloudflare';
import { createMistralProvider } from './mistral';
import { createHuggingFaceProvider } from './huggingface';
import { createVercelGatewayProvider } from './vercel-gateway';
import { createOpenAiProvider } from './openai';
import {
  createTogetherProvider, createFireworksProvider, createDeepInfraProvider,
  createNovitaProvider, createLeptonProvider, createHyperbolicProvider,
  createCohereProvider, createAi21Provider, createNvidiaProvider,
  createAnyscaleProvider, createDeepSeekProvider, createXaiProvider,
  createZhipuProvider, createQwenProvider, createMoonshotProvider,
  createFeatherlessProvider, createMancerProvider, createNscaleProvider,
} from './openai-compatible';
import type { IProvider } from './registry';

export interface ProviderWithRotation {
  provider: IProvider;
  rotator: KeyRotator;
  providerName: string;
  activeKey: RotatableKey;
}

const rotatorCache = new Map<string, ProviderWithRotation>();

export async function createProviderWithRotation(
  providerName: string,
  config?: Record<string, unknown>
): Promise<ProviderWithRotation | null> {
  const cached = rotatorCache.get(providerName);
  if (cached) {
    const key = cached.rotator.getNextKey();
    if (key) {
      return { ...cached, activeKey: key, provider: createProviderInstance(providerName, key.apiKey, config) };
    }
    return null;
  }

  const keys = await getProviderKeys(providerName);
  if (keys.length === 0) return null;

  const rotator = new KeyRotator({ strategy: 'priority' });
  const rotatableKeys: RotatableKey[] = keys.map(k => ({
    id: k.id,
    apiKey: k.api_key,
    label: k.label,
    priority: k.priority,
    enabled: k.enabled,
    successCount: k.success_count,
    errorCount: k.error_count,
    avgLatencyMs: k.avg_latency_ms,
    lastUsedAt: k.last_used_at,
  }));
  rotator.setKeys(rotatableKeys);

  const key = rotator.getNextKey();
  if (!key) return null;

  const provider = createProviderInstance(providerName, key.apiKey, config);

  const result: ProviderWithRotation = { provider, rotator, providerName, activeKey: key };
  rotatorCache.set(providerName, result);
  return result;
}

function createProviderInstance(name: string, apiKey: string, config?: Record<string, unknown>): IProvider {
  const timeoutMs = Number(config?.timeoutMs ?? 60000);
  const baseUrl = config?.baseUrl as string | undefined;
  const defaultModel = config?.defaultModel as string | undefined;

  switch (name) {
    case 'gemini':
      return createGeminiProvider({ apiKey, defaultModel, timeoutMs });
    case 'groq':
      return createGroqProvider({ apiKey, defaultModel, timeoutMs });
    case 'cerebras':
      return createCerebrasProvider({ apiKey, defaultModel, timeoutMs });
    case 'sambanova':
      return createSambaNovaProvider({ apiKey, defaultModel, timeoutMs });
    case 'openrouter':
      return createOpenRouterProvider({ apiKey, defaultModel, timeoutMs });
    case 'cloudflare':
      return createCloudflareProvider({ apiKey, defaultModel, accountId: config?.accountId as string, timeoutMs });
    case 'mistral':
      return createMistralProvider({ apiKey, defaultModel, timeoutMs });
    case 'huggingface':
      return createHuggingFaceProvider({ apiKey, defaultModel, timeoutMs });
    case 'vercel-gateway':
      return createVercelGatewayProvider({ apiKey, defaultModel, timeoutMs });
    case 'openai':
      return createOpenAiProvider({ apiKey, baseUrl, defaultModel, timeoutMs });
    // ── OpenAI-compatible providers ──────────────────────────────────────
    case 'together':
      return createTogetherProvider({ apiKey, defaultModel, timeoutMs });
    case 'fireworks':
      return createFireworksProvider({ apiKey, defaultModel, timeoutMs });
    case 'deepinfra':
      return createDeepInfraProvider({ apiKey, defaultModel, timeoutMs });
    case 'novita':
      return createNovitaProvider({ apiKey, defaultModel, timeoutMs });
    case 'lepton':
      return createLeptonProvider({ apiKey, defaultModel, timeoutMs });
    case 'hyperbolic':
      return createHyperbolicProvider({ apiKey, defaultModel, timeoutMs });
    case 'cohere':
      return createCohereProvider({ apiKey, defaultModel, timeoutMs });
    case 'ai21':
      return createAi21Provider({ apiKey, defaultModel, timeoutMs });
    case 'nvidia':
      return createNvidiaProvider({ apiKey, defaultModel, timeoutMs });
    case 'anyscale':
      return createAnyscaleProvider({ apiKey, defaultModel, timeoutMs });
    case 'deepseek':
      return createDeepSeekProvider({ apiKey, defaultModel, timeoutMs });
    case 'xai':
      return createXaiProvider({ apiKey, defaultModel, timeoutMs });
    case 'zhipu':
      return createZhipuProvider({ apiKey, defaultModel, timeoutMs });
    case 'qwen':
      return createQwenProvider({ apiKey, defaultModel, timeoutMs });
    case 'moonshot':
      return createMoonshotProvider({ apiKey, defaultModel, timeoutMs });
    case 'featherless':
      return createFeatherlessProvider({ apiKey, defaultModel, timeoutMs });
    case 'mancer':
      return createMancerProvider({ apiKey, defaultModel, timeoutMs });
    case 'nscale':
      return createNscaleProvider({ apiKey, defaultModel, timeoutMs });
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export function clearRotatorCache(): void {
  rotatorCache.clear();
}

export function getRotatorCache(): Map<string, ProviderWithRotation> {
  return rotatorCache;
}

export function invalidateProviderCache(providerName: string): void {
  rotatorCache.delete(providerName);
}
