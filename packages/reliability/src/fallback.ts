import type { FallbackConfig, FallbackStrategy, ProviderError, RoutingCandidate } from './types';

const DEFAULT_CONFIG: FallbackConfig = {
  maxAttempts: 3,
};

function isTransient(error: ProviderError): boolean {
  return error.retryable && ['rate_limit', 'server_error', 'timeout', 'routing_failure'].includes(error.code);
}

function categorizeError(error: ProviderError): FallbackStrategy | null {
  switch (error.code) {
    case 'rate_limit':
      return 'rotate_account';
    case 'timeout':
      return 'alternate_provider';
    case 'context_too_large':
      return 'larger_context_model';
    case 'unsupported_tool':
      return 'capability_compatible_model';
    case 'server_error':
      return 'retry';
    default:
      return null;
  }
}

function rotateAccount(candidates: RoutingCandidate[]): RoutingCandidate[] {
  const seen = new Set<string>();
  const ordered: RoutingCandidate[] = [];
  for (const c of candidates) {
    const key = `${c.provider.id}:${c.model.provider}`;
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(c);
    }
  }
  return ordered;
}

function alternateProvider(candidates: RoutingCandidate[]): RoutingCandidate[] {
  const seen = new Set<string>();
  const ordered: RoutingCandidate[] = [];
  for (const c of candidates) {
    if (!seen.has(c.provider.id)) {
      seen.add(c.provider.id);
      ordered.push(c);
    }
  }
  return ordered;
}

function largerContextModel(candidates: RoutingCandidate[]): RoutingCandidate[] {
  return [...candidates].sort((a, b) => b.model.contextWindow - a.model.contextWindow);
}

function capabilityCompatibleModel(candidates: RoutingCandidate[]): RoutingCandidate[] {
  return [...candidates].sort((a, b) => {
    const aHasTools = a.model.capabilities.includes('tools');
    const bHasTools = b.model.capabilities.includes('tools');
    if (aHasTools && !bHasTools) return -1;
    if (!aHasTools && bHasTools) return 1;
    return b.qualityScore - a.qualityScore;
  });
}

export class AutoFallback {
  private config: FallbackConfig;

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  buildFallbackChain(error: ProviderError, candidates: RoutingCandidate[]): RoutingCandidate[] {
    if (!isTransient(error)) {
      return [];
    }

    const strategy = categorizeError(error);
    if (!strategy) {
      return candidates.slice(0, this.config.maxAttempts);
    }

    let ordered: RoutingCandidate[] = [];
    switch (strategy) {
      case 'rotate_account':
        ordered = rotateAccount(candidates);
        break;
      case 'alternate_provider':
        ordered = alternateProvider(candidates);
        break;
      case 'larger_context_model':
        ordered = largerContextModel(candidates);
        break;
      case 'capability_compatible_model':
        ordered = capabilityCompatibleModel(candidates);
        break;
      case 'retry':
        ordered = [...candidates];
        break;
      default:
        ordered = candidates;
    }

    if (strategy === 'retry') {
      const first = candidates[0];
      if (first) {
        ordered = [first, ...ordered.filter(c => c.model.id !== first.model.id || c.provider.id !== first.provider.id)];
      }
    }

    return ordered.slice(0, this.config.maxAttempts);
  }

  shouldRetry(error: ProviderError, attempt: number): boolean {
    if (attempt >= this.config.maxAttempts) return false;
    return isTransient(error);
  }
}
