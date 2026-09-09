import type { ProviderAdapter } from '@bifrost/providers';
import type { DataResidencyConfig, RegionMetadata, ResidencyDecision } from './types';

const REGION_META_KEY = Symbol('bifrost.regionMeta');

declare module '@bifrost/providers' {
  interface ProviderAdapter {
    [REGION_META_KEY]?: RegionMetadata;
  }
}

export function setProviderRegion(provider: ProviderAdapter, region: RegionMetadata): void {
  provider[REGION_META_KEY] = region;
}

export function getProviderRegion(provider: ProviderAdapter): RegionMetadata | undefined {
  return provider[REGION_META_KEY];
}

export interface ResidencyAuditEntry {
  timestamp: string;
  tenant_id: string;
  request_id: string;
  decision: ResidencyDecision;
  providers_before: number;
  providers_after: number;
}

type AuditLogger = (entry: ResidencyAuditEntry) => void;

let globalAuditLogger: AuditLogger | null = null;

export function setResidencyAuditLogger(logger: AuditLogger | null): void {
  globalAuditLogger = logger;
}

export class DataResidencyEngine {
  filterProvidersByRegion(
    providers: ProviderAdapter[],
    residency: DataResidencyConfig
  ): ResidencyDecision {
    const before = providers.length;
    let allowed = [...providers];
    const reasons: string[] = [];

    if (residency.require_residency && residency.default_region) {
      const required = residency.default_region;
      allowed = allowed.filter((p) => {
        const meta = p[REGION_META_KEY];
        if (!meta) {
          reasons.push(`provider ${p.name} has no region metadata — included (global)`);
          return true;
        }
        if (meta.region === 'global') {
          reasons.push(`provider ${p.name} is global — included`);
          return true;
        }
        const ok = meta.region === required;
        reasons.push(`provider ${p.name} region=${meta.region} ${ok ? 'matches' : 'does not match'} required ${required}`);
        return ok;
      });
    }

    if (residency.prohibited_regions.length > 0) {
      const prohibited = new Set(residency.prohibited_regions);
      allowed = allowed.filter((p) => {
        const meta = p[REGION_META_KEY];
        if (!meta || meta.region === 'global') return true;
        const blocked = prohibited.has(meta.region);
        if (blocked) reasons.push(`provider ${p.name} region=${meta.region} is prohibited`);
        return !blocked;
      });
    }

    if (residency.allowed_regions.length > 0 && !residency.require_residency) {
      const allowedSet = new Set(residency.allowed_regions);
      allowed = allowed.filter((p) => {
        const meta = p[REGION_META_KEY];
        if (!meta || meta.region === 'global') return true;
        const ok = allowedSet.has(meta.region);
        if (!ok) reasons.push(`provider ${p.name} region=${meta.region} not in allowed_regions`);
        return ok;
      });
    }

    const after = allowed.length;
    const decision: ResidencyDecision = {
      allowed: after > 0,
      filteredProviders: allowed.map((p) => p.name),
      audit_reason: reasons.join('; ') || 'all providers passed region check',
      region: residency.default_region || residency.allowed_regions[0] || 'global',
    };

    return decision;
  }

  logResidencyDecision(entry: ResidencyAuditEntry): void {
    if (globalAuditLogger) {
      globalAuditLogger(entry);
    }
  }

  validateResidencyConfig(config: DataResidencyConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validRegions = ['us', 'eu', 'ap', 'global'];
    for (const r of config.allowed_regions) {
      if (!validRegions.includes(r)) errors.push(`Invalid allowed_region: ${r}`);
    }
    for (const r of config.prohibited_regions) {
      if (!validRegions.includes(r)) errors.push(`Invalid prohibited_region: ${r}`);
    }
    if (config.require_residency && !config.default_region) {
      errors.push('default_region required when require_residency is true');
    }
    return { valid: errors.length === 0, errors };
  }
}

export const residencyEngine = new DataResidencyEngine();
