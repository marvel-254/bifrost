import type { NormalizedRequest } from '@bifrost/shared';
import type { Policy, PolicyContext } from './types';

interface StoredPolicy {
  policy: Policy;
  versions: Array<{ version: string; yaml: string; created_at: string }>;
  current_version: string;
}

interface MatchResult {
  policy: Policy;
  score: number;
}

interface EvalContext {
  tenant: string;
  application: string;
  tags: string[];
  model: string;
  stream: boolean;
  tools: boolean;
  metadata: Record<string, unknown>;
}

function evaluateCondition(leaf: { field: string; operator: string; value: unknown }, ctx: EvalContext): boolean {
  const fieldVal = (ctx as unknown as Record<string, unknown>)[leaf.field];
  const op = leaf.operator;
  const target = leaf.value;

  switch (op) {
    case 'eq':
      return fieldVal === target;
    case 'neq':
      return fieldVal !== target;
    case 'gt':
      return typeof fieldVal === 'number' && typeof target === 'number' && fieldVal > target;
    case 'gte':
      return typeof fieldVal === 'number' && typeof target === 'number' && fieldVal >= target;
    case 'lt':
      return typeof fieldVal === 'number' && typeof target === 'number' && fieldVal < target;
    case 'lte':
      return typeof fieldVal === 'number' && typeof target === 'number' && fieldVal <= target;
    case 'in':
      return Array.isArray(target) && target.includes(fieldVal);
    case 'nin':
      return Array.isArray(target) && !target.includes(fieldVal);
    case 'contains':
      return typeof fieldVal === 'string' && typeof target === 'string' && fieldVal.includes(target);
    default:
      return false;
  }
}

function evaluatePolicyCondition(cond: { AND: unknown[]; OR: unknown[] }, ctx: EvalContext): boolean {
  for (const c of cond.AND) {
    if (!evaluateSingleCondition(c, ctx)) return false;
  }
  if (cond.OR.length === 0) return true;
  return cond.OR.some((c) => evaluateSingleCondition(c, ctx));
}

function evaluateSingleCondition(c: unknown, ctx: EvalContext): boolean {
  if (typeof c === 'object' && c !== null && 'field' in (c as Record<string, unknown>)) {
    const leaf = c as { field: string; operator: string; value: unknown };
    return evaluateCondition(leaf, ctx);
  }
  if (typeof c === 'object' && c !== null && 'AND' in (c as Record<string, unknown>)) {
    const nested = c as { AND: unknown[]; OR: unknown[] };
    return evaluatePolicyCondition(nested, ctx);
  }
  return false;
}

function buildContext(request: NormalizedRequest, policyCtx: PolicyContext): EvalContext {
  const metaTags = (request.metadata?.tags as string[]) || [];
  const ctxTags = policyCtx.tags || [];
  return {
    tenant: policyCtx.tenantId || '',
    application: policyCtx.application || '',
    tags: [...new Set([...metaTags, ...ctxTags])],
    model: request.model,
    stream: request.stream || false,
    tools: (request.tools?.length || 0) > 0,
    metadata: request.metadata || {},
  };
}

function matchPolicy(policy: Policy, ctx: EvalContext): boolean {
  const m = policy.match;
  if (m.tags && m.tags.length > 0) {
    if (!m.tags.some((t) => ctx.tags.includes(t))) return false;
  }
  if (m.tenant && m.tenant !== ctx.tenant) return false;
  if (m.application && m.application !== ctx.application) return false;
  if (m.conditions.AND.length > 0 || m.conditions.OR.length > 0) {
    if (!evaluatePolicyCondition(m.conditions, ctx)) return false;
  }
  return true;
}

export class PolicyRegistry {
  private policies: Map<string, StoredPolicy> = new Map();
  private byName: Map<string, { currentVersion: string; versions: string[] }> = new Map();

  registerPolicy(policy: Policy): void {
    const key = `${policy.name}:${policy.version}`;
    const now = new Date().toISOString();
    const existing = this.policies.get(key);

    if (existing) {
      existing.policy = policy;
      existing.versions.push({ version: policy.version, yaml: JSON.stringify(policy), created_at: now });
      existing.current_version = policy.version;
    } else {
      this.policies.set(key, {
        policy,
        versions: [{ version: policy.version, yaml: JSON.stringify(policy), created_at: now }],
        current_version: policy.version,
      });
    }

    const nameEntry = this.byName.get(policy.name) || { currentVersion: 'v1', versions: [] };
    if (!nameEntry.versions.includes(policy.version)) {
      nameEntry.versions.push(policy.version);
    }
    nameEntry.currentVersion = policy.version;
    this.byName.set(policy.name, nameEntry);

    for (const [k, stored] of this.policies.entries()) {
      if (k.startsWith(`${policy.name}:`) && k !== key) {
        stored.current_version = policy.version;
      }
    }
  }

  getPolicy(name: string, version?: string): Policy | null {
    if (version) {
      const key = `${name}:${version}`;
      return this.policies.get(key)?.policy || null;
    }
    const currentVersion = this.getCurrentVersion(name);
    if (!currentVersion) return null;
    const latestKey = `${name}:${currentVersion}`;
    return this.policies.get(latestKey)?.policy || null;
  }

  getPolicyVersion(name: string, version: string): { policy: Policy; created_at: string } | null {
    const stored = this.policies.get(`${name}:${version}`);
    if (!stored) return null;
    const vEntry = stored.versions.find((v) => v.version === version);
    return vEntry ? { policy: stored.policy, created_at: vEntry.created_at } : null;
  }

  rollbackPolicy(name: string, version: string): Policy | null {
    const stored = this.policies.get(`${name}:${version}`);
    if (!stored) return null;
    const current = stored.policy;
    current.version = version;
    current.extends = undefined;
    this.registerPolicy(current);
    return current;
  }

  listPolicies(): Policy[] {
    const result: Policy[] = [];
    const seen = new Set<string>();
    for (const [key, stored] of this.policies.entries()) {
      if (stored.current_version === stored.policy.version && !seen.has(key)) {
        result.push(stored.policy);
        seen.add(key);
      }
    }
    return result.sort((a, b) => b.priority - a.priority);
  }

  listVersions(name: string): string[] {
    return this.byName.get(name)?.versions || [];
  }

  getCurrentVersion(name: string): string {
    return this.byName.get(name)?.currentVersion || 'v1';
  }

  getLatestVersion(name: string): string {
    return this.getCurrentVersion(name);
  }

  resolvePolicy(request: NormalizedRequest, ctx: PolicyContext): Policy | null {
    const context = buildContext(request, ctx);
    const candidates: MatchResult[] = [];

    for (const stored of this.policies.values()) {
      const policy = stored.policy;
      if (!policy.enabled) continue;
      if (stored.current_version !== policy.version) continue;
      if (matchPolicy(policy, context)) {
        candidates.push({ policy, score: policy.priority });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length === 0) return null;

    let resolved = candidates[0].policy;
    const visited = new Set<string>();
    const chain: Policy[] = [resolved];
    while (resolved.extends) {
      if (visited.has(resolved.extends)) break;
      visited.add(resolved.extends);
      const parent = this.getPolicy(resolved.extends, resolved.version);
      if (!parent) break;
      chain.push(parent);
      resolved = parent;
    }

    const base = chain[chain.length - 1];
    const child = chain[0];
    return this.mergePolicies(base, child);
  }

  private mergePolicies(base: Policy, override: Policy): Policy {
    if (!base || base.name === override.name) return override;
    return {
      ...override,
      constraints: { ...base.constraints, ...override.constraints },
      require: { ...base.require, ...override.require },
      prefer: { ...base.prefer, ...override.prefer },
      fallback: { ...base.fallback, ...override.fallback },
      optimization: { ...base.optimization, ...override.optimization },
    };
  }
}
