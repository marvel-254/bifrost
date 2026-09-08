import type { FallbackConfig, FallbackStrategy, RoutingCandidate } from './types';

const DEFAULT_CONFIG: FallbackConfig = {
  maxAttempts: 3,
};

interface ProviderErrorLike {
  code: string;
  message: string;
  status: number;
  provider: string;
  retryable: boolean;
}

function isTransient(error: ProviderErrorLike): boolean {
  return error.retryable && ['RATE_LIMIT', 'SERVER_ERROR', 'TIMEOUT', 'ROUTING_FAILURE', 'CONTEXT_TOO_LARGE', 'UNSUPPORTED_TOOL'].includes(error.code);
}

function categorizeError(error: ProviderErrorLike): FallbackStrategy | null {
  switch (error.code) {
    case 'RATE_LIMIT':
      return 'rotate_account';
    case 'TIMEOUT':
      return 'alternate_provider';
    case 'CONTEXT_TOO_LARGE':
      return 'larger_context_model';
    case 'UNSUPPORTED_TOOL':
      return 'capability_compatible_model';
    case 'SERVER_ERROR':
      return 'retry';
    default:
      return null;
  }
}

function rotateAccount(candidates: RoutingCandidate[], errorProvider: string): RoutingCandidate[] {
  const seen = new Set<string>();
  const ordered: RoutingCandidate[] = [];
  for (const c of candidates) {
    const key = `${c.provider.id}:${c.model.provider}`;
    if (!seen.has(key) && c.provider.id !== errorProvider) {
      seen.add(key);
      ordered.push(c);
    }
  }
  return ordered;
}

function alternateProvider(candidates: RoutingCandidate[], errorProvider: string): RoutingCandidate[] {
  const seen = new Set<string>();
  const ordered: RoutingCandidate[] = [];
  for (const c of candidates) {
    if (!seen.has(c.provider.id) && c.provider.id !== errorProvider) {
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

  buildFallbackChain(error: ProviderErrorLike, candidates: RoutingCandidate[]): RoutingCandidate[] {
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
        ordered = rotateAccount(candidates, error.provider);
        break;
      case 'alternate_provider':
        ordered = alternateProvider(candidates, error.provider);
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

  shouldRetry(error: ProviderErrorLike, attempt: number): boolean {
    if (attempt >= this.config.maxAttempts) return false;
    return isTransient(error);
  }
}
