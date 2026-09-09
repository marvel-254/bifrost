import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import {
  MarketplaceOffer,
  MarketplaceConsumption,
  ConsumptionResult,
  CreateOfferInput,
  OfferLimits,
  OfferStatus,
  ConsumptionStatus,
  CredentialBroker,
  ProviderCredentials,
  TenantMarketplaceConfig,
  TrustScore,
  CreditAmount,
  TokenAmount,
  trustScore,
  credits,
  tokens,
  NormalizedRequest,
} from './types';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

const ENCRYPTION_KEY = process.env.MARKETPLACE_ENCRYPTION_KEY || 'default-key-change-in-production';

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), Buffer.alloc(16, 0));
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${encrypted.toString('hex')}:${authTag.toString('hex')}`;
}

function decrypt(encryptedText: string): string {
  const [encryptedHex, authTagHex] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), Buffer.alloc(16, 0));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8');
}

function generateId(): string {
  return crypto.randomUUID();
}

function generateOfferId(): string {
  return `offer_${crypto.randomBytes(16).toString('hex')}`;
}

function generateConsumptionId(): string {
  return `consumption_${crypto.randomBytes(16).toString('hex')}`;
}

export class QuotaMarketplace {
  private credentialBroker: CredentialBroker;
  private tenantConfigs: Map<string, TenantMarketplaceConfig> = new Map();
  private rateLimits: Map<string, { count: number; windowStart: number }> = new Map();
  private anomalyThresholds: Map<string, { avgTokens: number; stdDev: number; count: number }> = new Map();

  constructor() {
    this.credentialBroker = new SecureCredentialBroker();
  }

  async createOffer(input: CreateOfferInput): Promise<MarketplaceOffer> {
    const sql = getSql();
    if (!sql) throw new Error('Database connection not available');

    const id = generateOfferId();
    const now = new Date().toISOString();

    await sql`
      INSERT INTO marketplace_offers (
        id, provider, account_id, capacity_per_day, price_per_token,
        trust_score, limits, credits_balance, status, tenant_id,
        created_at, updated_at
      ) VALUES (
        ${id}, ${input.provider}, ${input.accountId}, ${input.capacityPerDay},
        ${input.pricePerToken}, ${input.trustScore}, ${JSON.stringify(input.limits)},
        ${input.initialCredits}, 'pending_verification', ${input.tenantId},
        ${now}, ${now}
      )
    `;

    return {
      id,
      provider: input.provider,
      accountId: input.accountId,
      capacityPerDay: input.capacityPerDay,
      pricePerToken: input.pricePerToken,
      trustScore: input.trustScore,
      limits: input.limits,
      creditsBalance: input.initialCredits,
      status: 'pending_verification',
      tenantId: input.tenantId,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getOffer(offerId: string): Promise<MarketplaceOffer | null> {
    const sql = getSql();
    if (!sql) return null;

    try {
      const rows = await sql`SELECT * FROM marketplace_offers WHERE id = ${offerId}`;
      if (rows.length === 0) return null;
      return this.mapRowToOffer(rows[0]);
    } catch {
      return null;
    }
  }

  async getOffersByTenant(tenantId: string): Promise<MarketplaceOffer[]> {
    const sql = getSql();
    if (!sql) return [];

    try {
      const rows = await sql`SELECT * FROM marketplace_offers WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`;
      return rows.map(this.mapRowToOffer);
    } catch {
      return [];
    }
  }

  async getActiveOffers(provider?: string, tenantId?: string): Promise<MarketplaceOffer[]> {
    const sql = getSql();
    if (!sql) return [];

    try {
      let query = sql`SELECT * FROM marketplace_offers WHERE status = 'active' AND credits_balance > 0`;
      if (provider) {
        query = sql`SELECT * FROM marketplace_offers WHERE status = 'active' AND credits_balance > 0 AND provider = ${provider}`;
      }
      if (tenantId) {
        query = sql`SELECT * FROM marketplace_offers WHERE status = 'active' AND credits_balance > 0 AND tenant_id = ${tenantId}`;
      }
      if (provider && tenantId) {
        query = sql`SELECT * FROM marketplace_offers WHERE status = 'active' AND credits_balance > 0 AND provider = ${provider} AND tenant_id = ${tenantId}`;
      }
      const rows = await query;
      return rows.map(this.mapRowToOffer);
    } catch {
      return [];
    }
  }

  async consumeCapacity(tenantId: string, request: NormalizedRequest): Promise<ConsumptionResult> {
    const tenantConfig = this.getTenantConfig(tenantId);
    if (!tenantConfig?.optedIn) {
      return { success: false, tokensAllocated: tokens(0), creditsCharged: credits(0), error: 'Tenant not opted into marketplace' };
    }

    if (!this.checkRateLimit(tenantId)) {
      return { success: false, tokensAllocated: tokens(0), creditsCharged: credits(0), error: 'Rate limit exceeded' };
    }

    if (this.detectAnomaly(tenantId, request)) {
      return { success: false, tokensAllocated: tokens(0), creditsCharged: credits(0), error: 'Anomaly detected' };
    }

    const estimatedTokens = this.estimateTokens(request);
    const offers = await this.getActiveOffers(undefined, tenantId);

    const eligibleOffers = offers.filter(offer => this.isOfferEligible(offer, request, estimatedTokens, tenantConfig));
    if (eligibleOffers.length === 0) {
      return { success: false, tokensAllocated: tokens(0), creditsCharged: credits(0), error: 'No eligible offers', fallbackUsed: true };
    }

    const selectedOffer = this.selectBestOffer(eligibleOffers, request);
    const creditsNeeded = credits(estimatedTokens * selectedOffer.pricePerToken);

    if (selectedOffer.creditsBalance < creditsNeeded) {
      return { success: false, tokensAllocated: tokens(0), creditsCharged: credits(0), error: 'Insufficient credits', fallbackUsed: true };
    }

    const consumptionId = generateConsumptionId();
    const now = new Date().toISOString();

    const sql = getSql();
    if (!sql) {
      return { success: false, tokensAllocated: tokens(0), creditsCharged: credits(0), error: 'Database unavailable' };
    }

    try {
      await sql`
        INSERT INTO marketplace_consumption (
          id, tenant_id, offer_id, tokens_used, credits_spent,
          request_id, model, provider, status, created_at
        ) VALUES (
          ${consumptionId}, ${tenantId}, ${selectedOffer.id}, ${estimatedTokens},
          ${creditsNeeded}, ${request.metadata?.requestId || 'unknown'},
          ${request.model}, ${selectedOffer.provider}, 'completed', ${now}
        )
      `;

      await sql`
        UPDATE marketplace_offers
        SET credits_balance = credits_balance - ${creditsNeeded},
            capacity_per_day = capacity_per_day - ${estimatedTokens},
            updated_at = ${now}
        WHERE id = ${selectedOffer.id}
      `;

      if (selectedOffer.creditsBalance - creditsNeeded <= 0) {
        await sql`UPDATE marketplace_offers SET status = 'exhausted' WHERE id = ${selectedOffer.id}`;
      }

      return {
        success: true,
        consumptionId,
        tokensAllocated: tokens(estimatedTokens),
        creditsCharged: creditsNeeded,
        offerId: selectedOffer.id,
      };
    } catch (error) {
      return { success: false, tokensAllocated: tokens(0), creditsCharged: credits(0), error: String(error) };
    }
  }

  async recordConsumption(consumption: Omit<MarketplaceConsumption, 'id' | 'createdAt'>): Promise<MarketplaceConsumption> {
    const sql = getSql();
    if (!sql) throw new Error('Database connection not available');

    const id = generateConsumptionId();
    const now = new Date().toISOString();

    await sql`
      INSERT INTO marketplace_consumption (
        id, tenant_id, offer_id, tokens_used, credits_spent,
        request_id, model, provider, status, created_at
      ) VALUES (
        ${id}, ${consumption.tenantId}, ${consumption.offerId}, ${consumption.tokensUsed},
        ${consumption.creditsSpent}, ${consumption.requestId}, ${consumption.model},
        ${consumption.provider}, ${consumption.status}, ${now}
      )
    `;

    return { ...consumption, id, createdAt: now };
  }

  async getConsumptionHistory(tenantId: string, limit = 100): Promise<MarketplaceConsumption[]> {
    const sql = getSql();
    if (!sql) return [];

    try {
      const rows = await sql`
        SELECT * FROM marketplace_consumption
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      return rows.map(this.mapRowToConsumption);
    } catch {
      return [];
    }
  }

  async getCredentialBroker(): Promise<CredentialBroker> {
    return this.credentialBroker;
  }

  setTenantConfig(config: TenantMarketplaceConfig): void {
    this.tenantConfigs.set(config.tenantId, config);
  }

  getTenantConfig(tenantId: string): TenantMarketplaceConfig | undefined {
    return this.tenantConfigs.get(tenantId);
  }

  private checkRateLimit(tenantId: string): boolean {
    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 100;

    const current = this.rateLimits.get(tenantId);
    if (!current || now - current.windowStart > windowMs) {
      this.rateLimits.set(tenantId, { count: 1, windowStart: now });
      return true;
    }

    if (current.count >= maxRequests) {
      return false;
    }

    current.count++;
    return true;
  }

  private detectAnomaly(tenantId: string, request: NormalizedRequest): boolean {
    const estimatedTokens = this.estimateTokens(request);
    const stats = this.anomalyThresholds.get(tenantId);

    if (!stats || stats.count < 10) {
      this.anomalyThresholds.set(tenantId, {
        avgTokens: estimatedTokens,
        stdDev: 0,
        count: (stats?.count || 0) + 1,
      });
      return false;
    }

    const zScore = Math.abs(estimatedTokens - stats.avgTokens) / (stats.stdDev || 1);
    if (zScore > 3) {
      return true;
    }

    const newCount = stats.count + 1;
    const newAvg = stats.avgTokens + (estimatedTokens - stats.avgTokens) / newCount;
    const newStdDev = Math.sqrt(
      (stats.stdDev * stats.stdDev * stats.count + (estimatedTokens - stats.avgTokens) * (estimatedTokens - newAvg)) / newCount
    );

    this.anomalyThresholds.set(tenantId, { avgTokens: newAvg, stdDev: newStdDev, count: newCount });
    return false;
  }

  private estimateTokens(request: NormalizedRequest): number {
    let total = 0;
    for (const msg of request.messages) {
      total += msg.content.length / 4;
    }
    return Math.max(1, Math.ceil(total));
  }

  private isOfferEligible(
    offer: MarketplaceOffer,
    request: NormalizedRequest,
    estimatedTokens: number,
    tenantConfig: TenantMarketplaceConfig
  ): boolean {
    if (offer.status !== 'active') return false;
    if (offer.creditsBalance < credits(estimatedTokens * offer.pricePerToken)) return false;
    if (offer.capacityPerDay < tokens(estimatedTokens)) return false;
    if (offer.limits.maxTokensPerRequest < tokens(estimatedTokens)) return false;

    if (tenantConfig.allowedProviders && !tenantConfig.allowedProviders.includes(offer.provider)) return false;
    if (tenantConfig.disallowedProviders?.includes(offer.provider)) return false;
    if (offer.trustScore < tenantConfig.trustThreshold) return false;

    if (offer.limits.allowedModels && !offer.limits.allowedModels.includes(request.model)) return false;
    if (offer.limits.disallowedModels?.includes(request.model)) return false;

    return true;
  }

  private selectBestOffer(offers: MarketplaceOffer[], request: NormalizedRequest): MarketplaceOffer {
    return offers.reduce((best, current) => {
      const bestScore = this.scoreOffer(best, request);
      const currentScore = this.scoreOffer(current, request);
      return currentScore > bestScore ? current : best;
    });
  }

  private scoreOffer(offer: MarketplaceOffer, request: NormalizedRequest): number {
    let score = 0;
    score += (1 - offer.pricePerToken) * 0.4;
    score += (offer.trustScore / 100) * 0.3;
    score += (offer.creditsBalance / 10000) * 0.2;
    score += (offer.capacityPerDay / 1000000) * 0.1;
    return score;
  }

  private mapRowToOffer(row: Record<string, unknown>): MarketplaceOffer {
    return {
      id: row.id as string,
      provider: row.provider as string,
      accountId: row.account_id as string,
      capacityPerDay: tokens(Number(row.capacity_per_day)),
      pricePerToken: Number(row.price_per_token),
      trustScore: trustScore(Number(row.trust_score)),
      limits: row.limits as OfferLimits,
      creditsBalance: credits(Number(row.credits_balance)),
      status: row.status as OfferStatus,
      tenantId: row.tenant_id as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      metadata: row.metadata as Record<string, unknown> | undefined,
    };
  }

  private mapRowToConsumption(row: Record<string, unknown>): MarketplaceConsumption {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      offerId: row.offer_id as string,
      tokensUsed: tokens(Number(row.tokens_used)),
      creditsSpent: credits(Number(row.credits_spent)),
      requestId: row.request_id as string,
      model: row.model as string,
      provider: row.provider as string,
      status: row.status as ConsumptionStatus,
      createdAt: row.created_at as string,
      metadata: row.metadata as Record<string, unknown> | undefined,
    };
  }
}

export class SecureCredentialBroker implements CredentialBroker {
  private credentials: Map<string, ProviderCredentials> = new Map();

  async getCredentials(offerId: string): Promise<ProviderCredentials | null> {
    const creds = this.credentials.get(offerId);
    if (!creds) return null;

    return {
      ...creds,
      apiKey: creds.encrypted ? decrypt(creds.apiKey) : creds.apiKey,
      encrypted: false,
    };
  }

  async storeCredentials(offerId: string, credentials: ProviderCredentials): Promise<void> {
    this.credentials.set(offerId, {
      ...credentials,
      apiKey: credentials.encrypted ? credentials.apiKey : encrypt(credentials.apiKey),
      encrypted: true,
    });
  }

  async revokeCredentials(offerId: string): Promise<void> {
    this.credentials.delete(offerId);
  }

  async rotateCredentials(offerId: string, newCredentials: ProviderCredentials): Promise<void> {
    await this.storeCredentials(offerId, newCredentials);
  }
}

export const marketplace = new QuotaMarketplace();