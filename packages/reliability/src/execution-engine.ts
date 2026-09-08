import type { ReliabilityConfig, RoutingCandidate } from './types';
import type { NormalizedRequest, NormalizedResponse, NormalizedStreamEvent } from '@bifrost/shared';
import { CircuitBreaker } from './circuit-breaker';
import { ProviderCooldown } from './cooldown';
import { AutoFallback } from './fallback';
import { BackpressureEngine } from './backpressure';
import { PriorityQueue } from './priority-queue';
import { StreamKeepalive } from './stream-keepalive';

export interface ExecutionRequest {
  request: NormalizedRequest;
  candidates: RoutingCandidate[];
  stream: boolean;
  tenantId?: string;
}

export interface ExecutionOptions {
  circuitBreaker: CircuitBreaker;
  cooldown: ProviderCooldown;
  fallback: AutoFallback;
  backpressure: BackpressureEngine;
  priorityQueue: PriorityQueue;
  streamKeepalive: StreamKeepalive;
  providerRegistry: Map<string, {
    chat(request: NormalizedRequest): Promise<NormalizedResponse>;
    stream(request: NormalizedRequest): AsyncIterable<NormalizedStreamEvent>;
  }>;
  config: ReliabilityConfig;
}

export class ExecutionEngine {
  private options: ExecutionOptions;

  constructor(options: ExecutionOptions) {
    this.options = options;
  }

  async executeWithReliability(req: ExecutionRequest): Promise<NormalizedResponse> {
    const { request, candidates, stream, tenantId } = req;
    const { circuitBreaker, cooldown, backpressure, providerRegistry, config } = this.options;

    let lastError: Error | null = null;
    let remainingCandidates = [...candidates];

    for (const candidate of remainingCandidates) {
      const providerKey = `provider:${candidate.provider.id}`;
      const modelKey = `model:${candidate.model.id}`;
      const providerModelKey = `provider:model:${candidate.provider.id}:${candidate.model.id}`;

      if (cooldown.isInCooldown(providerKey) || cooldown.isInCooldown(modelKey) || cooldown.isInCooldown(providerModelKey)) {
        lastError = new Error(`Provider/model in cooldown: ${providerModelKey}`);
        continue;
      }

      const cbMetrics = circuitBreaker.getMetrics(providerModelKey);
      if (cbMetrics.state === 'OPEN') {
        lastError = new Error(`Circuit breaker open: ${providerModelKey}`);
        continue;
      }

      const adapter = providerRegistry.get(candidate.provider.id);
      if (!adapter) {
        lastError = new Error(`Provider adapter not found: ${candidate.provider.id}`);
        continue;
      }

      try {
        const release = await backpressure.acquireSlot(candidate.provider.id, 'normal');
        try {
          const result = await circuitBreaker.execute(
            providerModelKey,
            async () => adapter.chat(request),
            config.circuitBreaker
          );
          backpressure.recordCompletion(candidate.provider.id, 0);
          return result as NormalizedResponse;
        } finally {
          release();
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const category = this.categorizeError(lastError);
        cooldown.enterCooldown(providerModelKey, category);

        const fallbackChain = this.options.fallback.buildFallbackChain(
          { code: 'PROVIDER_ERROR', message: lastError.message, status: 500, provider: candidate.provider.id, retryable: true },
          remainingCandidates
        );
        remainingCandidates = fallbackChain;
      }
    }

    throw lastError ?? new Error('All candidates failed');
  }

  async *executeStreamWithReliability(req: ExecutionRequest): AsyncIterable<NormalizedStreamEvent> {
    const { request, candidates, stream, tenantId } = req;
    const { circuitBreaker, cooldown, backpressure, providerRegistry, config, streamKeepalive } = this.options;

    let lastError: Error | null = null;
    let remainingCandidates = [...candidates];

    for (const candidate of remainingCandidates) {
      const providerKey = `provider:${candidate.provider.id}`;
      const modelKey = `model:${candidate.model.id}`;
      const providerModelKey = `provider:model:${candidate.provider.id}:${candidate.model.id}`;

      if (cooldown.isInCooldown(providerKey) || cooldown.isInCooldown(modelKey) || cooldown.isInCooldown(providerModelKey)) {
        lastError = new Error(`Provider/model in cooldown: ${providerModelKey}`);
        continue;
      }

      const cbMetrics = circuitBreaker.getMetrics(providerModelKey);
      if (cbMetrics.state === 'OPEN') {
        lastError = new Error(`Circuit breaker open: ${providerModelKey}`);
        continue;
      }

      const adapter = providerRegistry.get(candidate.provider.id);
      if (!adapter) {
        lastError = new Error(`Provider adapter not found: ${candidate.provider.id}`);
        continue;
      }

      try {
        const release = await backpressure.acquireSlot(candidate.provider.id, 'normal');
        try {
          const session = streamKeepalive.createSession({
            requestId: request.user ?? 'unknown',
            provider: candidate.provider.id,
            model: candidate.model.id,
          });

          try {
            for await (const chunk of adapter.stream(request)) {
              streamKeepalive.recordChunk(session.id);
              yield chunk;
            }
          } finally {
            streamKeepalive.closeSession(session.id);
          }

          backpressure.recordCompletion(candidate.provider.id, 0);
          return;
        } finally {
          release();
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const category = this.categorizeError(lastError);
        cooldown.enterCooldown(providerModelKey, category);

        const fallbackChain = this.options.fallback.buildFallbackChain(
          { code: 'PROVIDER_ERROR', message: lastError.message, status: 500, provider: candidate.provider.id, retryable: true },
          remainingCandidates
        );
        remainingCandidates = fallbackChain;
      }
    }

    throw lastError ?? new Error('All candidates failed');
  }

  private categorizeError(error: Error): 'rate_limit' | 'server_error' | 'timeout' | 'auth_failure' | 'context_too_large' | 'unsupported_tool' {
    const msg = error.message.toLowerCase();
    if (msg.includes('429') || msg.includes('rate limit')) return 'rate_limit';
    if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
    if (msg.includes('auth') || msg.includes('401') || msg.includes('403')) return 'auth_failure';
    if (msg.includes('context') || msg.includes('too large')) return 'context_too_large';
    if (msg.includes('tool') || msg.includes('unsupported')) return 'unsupported_tool';
    return 'server_error';
  }
}
