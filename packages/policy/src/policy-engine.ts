import yaml from 'js-yaml';
import type { Policy, PolicyContext, PolicyDecision, PolicyConstraints, CompressionLevel, FallbackStrategy, NormalizedRequest, PolicyConditionLeaf } from './types';
import { PolicyRegistry } from './policy-registry';

export interface PolicyEngineOptions {
  registry?: PolicyRegistry;
  defaultPolicy?: Partial<Policy>;
}

export class PolicyEngine {
  private registry: PolicyRegistry;
  private defaultPolicy: Partial<Policy>;

  constructor(options: PolicyEngineOptions = {}) {
    this.registry = options.registry || new PolicyRegistry();
    this.defaultPolicy = options.defaultPolicy || {};
  }

  loadYaml(yamlString: string): Policy[] {
    const parsed = yaml.load(yamlString) as Record<string, unknown>;
    const policies: Policy[] = [];
    const rawPolicies = (parsed.policies as Record<string, unknown>[]) || [];
    for (const raw of rawPolicies) {
      policies.push(this.normalizePolicy(raw as Record<string, unknown>));
    }
    return policies;
  }

  loadYamlFile(path: string): Policy[] {
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf-8');
    return this.loadYaml(content);
  }

  registerPolicy(policy: Policy): void {
    this.registry.registerPolicy(policy);
  }

  getPolicy(name: string, version?: string): Policy | null {
    return this.registry.getPolicy(name, version);
  }

  listPolicies(): Policy[] {
    return this.registry.listPolicies();
  }

  evaluatePolicy(request: NormalizedRequest, context: PolicyContext): PolicyDecision {
    const matched = this.registry.resolvePolicy(request, context);
    const policy = matched || this.buildDefaultPolicy();
    const constraints = policy.constraints || {};

    const compression = this.resolveCompression(policy, request);
    const allowedProviders = this.extractAllowedProviders(policy, request);
    const allowedRegions: string[] = constraints.allowed_regions && constraints.allowed_regions.length > 0
      ? constraints.allowed_regions
      : constraints.data_region
        ? [constraints.data_region].filter(Boolean) as string[]
        : [];

    return {
      matchedPolicy: policy,
      effectiveConstraints: constraints,
      routingStrategy: this.defaultPolicy.name || 'balanced',
      compressionLevel: compression,
      cacheEnabled: policy.optimization?.cache ?? true,
      allowedProviders,
      allowedRegions,
      fallbackStrategy: policy.fallback?.strategy || 'auto',
      requiresTools: policy.require?.tools ?? false,
      requiresStructuredOutput: policy.require?.structured_output ?? false,
      requiredCapabilities: policy.require?.capabilities || [],
      qualityPreference: policy.prefer?.quality || 'medium',
      costPreference: policy.prefer?.cost || 'medium',
      latencyPreference: policy.prefer?.latency || 'medium',
    };
  }

  getRegistry(): PolicyRegistry {
    return this.registry;
  }

  private normalizePolicy(raw: Record<string, unknown>): Policy {
    const r = raw as Record<string, unknown>;
    const matchRaw = (r.match as Record<string, unknown>) || {};
    const conditionsRaw = (matchRaw.conditions as Record<string, unknown>) || { AND: [], OR: [] };
    const requireRaw = (r.require as Record<string, unknown>) || {};
    const preferRaw = (r.prefer as Record<string, unknown>) || {};
    const fallbackRaw = (r.fallback as Record<string, unknown>) || {};
    const optimizationRaw = (r.optimization as Record<string, unknown>) || {};
    const constraintsRaw = (r.constraints as Record<string, unknown>) || {};

    return {
      name: String(r.name || 'default'),
      priority: Number(r.priority || 0),
      version: String(r.version || 'v1'),
      extends: r.extends ? String(r.extends) : undefined,
      enabled: r.enabled !== false,
      match: {
        tags: Array.isArray(matchRaw.tags) ? matchRaw.tags.map(String) : [],
        tenant: matchRaw.tenant ? String(matchRaw.tenant) : undefined,
        application: matchRaw.application ? String(matchRaw.application) : undefined,
        conditions: this.normalizeConditions(conditionsRaw),
      },
      constraints: this.normalizeConstraints(constraintsRaw),
      require: {
        tools: Boolean(requireRaw.tools),
        structured_output: Boolean(requireRaw.structured_output),
        capabilities: Array.isArray(requireRaw.capabilities) ? requireRaw.capabilities.map(String) : [],
      },
      prefer: {
        quality: (preferRaw.quality as Policy['prefer']['quality']) || 'medium',
        cost: (preferRaw.cost as Policy['prefer']['cost']) || 'medium',
        latency: (preferRaw.latency as Policy['prefer']['latency']) || 'medium',
      },
      fallback: {
        strategy: (fallbackRaw.strategy as FallbackStrategy) || 'auto',
      },
      optimization: {
        compression: (optimizationRaw.compression as CompressionLevel) || 'auto',
        cache: Boolean(optimizationRaw.cache ?? true),
      },
    };
  }

  private normalizeConditions(raw: Record<string, unknown>): Policy['match']['conditions'] {
    const and = ((raw.AND as unknown[]) || []).map((c: unknown) => {
      if (typeof c === 'object' && c !== null && 'field' in (c as Record<string, unknown>)) {
        const leaf = c as { field: string; operator: string; value: unknown };
        return { field: leaf.field, operator: leaf.operator as PolicyConditionLeaf['operator'], value: leaf.value };
      }
      return { field: '', operator: 'eq' as PolicyConditionLeaf['operator'], value: null };
    });
    const or = ((raw.OR as unknown[]) || []).map((c: unknown) => {
      if (typeof c === 'object' && c !== null && 'field' in (c as Record<string, unknown>)) {
        const leaf = c as { field: string; operator: string; value: unknown };
        return { field: leaf.field, operator: leaf.operator as PolicyConditionLeaf['operator'], value: leaf.value };
      }
      return { field: '', operator: 'eq' as PolicyConditionLeaf['operator'], value: null };
    });
    return { AND: and, OR: or };
  }

  private normalizeConstraints(raw: Record<string, unknown>): PolicyConstraints {
    const out: PolicyConstraints = {};
    if (raw.max_cost !== undefined) out.max_cost = Number(raw.max_cost);
    if (raw.max_latency_ms !== undefined) out.max_latency_ms = Number(raw.max_latency_ms);
    if (raw.data_region) out.data_region = String(raw.data_region);
    if (Array.isArray(raw.allowed_regions)) out.allowed_regions = raw.allowed_regions.map(String);
    if (Array.isArray(raw.prohibited_regions)) out.prohibited_regions = raw.prohibited_regions.map(String);
    return out;
  }

  private buildDefaultPolicy(): Policy {
    return {
      name: 'default',
      priority: 0,
      version: 'v1',
      enabled: true,
      match: { conditions: { AND: [], OR: [] } },
      constraints: {},
      require: { tools: false, structured_output: false, capabilities: [] },
      prefer: { quality: 'medium', cost: 'medium', latency: 'medium' },
      fallback: { strategy: 'auto' },
      optimization: { compression: 'auto', cache: true },
    };
  }

  private resolveCompression(policy: Policy, request: NormalizedRequest): CompressionLevel {
    const level = policy.optimization?.compression || 'auto';
    if (level !== 'auto') return level;
    if (request.stream) return 'safe';
    if ((request.tools?.length || 0) > 0) return 'safe';
    return 'balanced';
  }

  private extractAllowedProviders(policy: Policy, request: NormalizedRequest): string[] {
    return [];
  }
}
