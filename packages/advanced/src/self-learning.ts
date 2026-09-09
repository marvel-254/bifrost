import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import {
  RoutingDecision,
  RoutingOutcome,
  StrategyWeights,
  TrainingData,
  TrainingFeature,
  SimulationResult,
  StrategyVersion,
  StrategyStatus,
  ProviderSimulationResult,
  ModelSimulationResult,
  tokens,
} from './types';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

const DEFAULT_WEIGHTS: StrategyWeights = {
  capabilityMatch: 0.30,
  quality: 0.25,
  reliability: 0.15,
  costEfficiency: 0.15,
  latency: 0.10,
  availability: 0.05,
  version: 'default',
};

function generateVersionId(): string {
  return `v${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function generateStrategyId(): string {
  return `strategy_${crypto.randomBytes(12).toString('hex')}`;
}

function hashTrainingData(data: TrainingData): string {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data.decisions.map(d => d.id).sort()));
  hash.update(JSON.stringify(data.outcomes.map(o => o.decisionId).sort()));
  return hash.digest('hex').slice(0, 16);
}

export class SelfLearningEngine {
  private currentVersion: string = 'default';
  private strategyVersions: Map<string, StrategyVersion> = new Map();
  private pendingTrainingData: TrainingFeature[] = [];

  constructor() {
    this.initializeDefaultStrategy();
  }

  private initializeDefaultStrategy(): void {
    const version = 'default';
    this.strategyVersions.set(version, {
      version,
      weights: { ...DEFAULT_WEIGHTS, version },
      status: 'active',
      createdAt: new Date().toISOString(),
      promotedAt: new Date().toISOString(),
    });
    this.currentVersion = version;
  }

  async recordOutcome(decision: RoutingDecision, outcome: RoutingOutcome): Promise<void> {
    const sql = getSql();
    if (!sql) return;

    const feature: TrainingFeature = {
      requestType: decision.metadata?.requestType as string || 'unknown',
      model: outcome.model,
      provider: outcome.provider,
      accountId: decision.metadata?.accountId as string,
      compressionUsed: decision.metadata?.compressionUsed as boolean || false,
      latencyMs: outcome.latencyMs,
      tokensUsed: outcome.tokensUsed,
      cost: outcome.cost,
      error: !outcome.success,
      fallbackUsed: outcome.fallbackUsed,
      validationPassed: outcome.validationPassed,
      qualityScore: outcome.qualityScore,
    };

    this.pendingTrainingData.push(feature);

    try {
      await sql`
        INSERT INTO strategy_training_data (
          id, decision_id, request_type, model, provider, account_id,
          compression_used, latency_ms, tokens_used, cost,
          error, fallback_used, validation_passed, quality_score,
          created_at
        ) VALUES (
          ${generateStrategyId()}, ${decision.id}, ${feature.requestType},
          ${feature.model}, ${feature.provider}, ${feature.accountId || ''},
          ${feature.compressionUsed}, ${feature.latencyMs}, ${feature.tokensUsed},
          ${feature.cost}, ${feature.error}, ${feature.fallbackUsed},
          ${feature.validationPassed}, ${feature.qualityScore || 0},
          ${new Date().toISOString()}
        )
      `;
    } catch {
      // Non-blocking
    }

    if (this.pendingTrainingData.length >= 100) {
      await this.trainFromPending();
    }
  }

  async trainStrategy(dataset: TrainingData): Promise<StrategyWeights> {
    const features = dataset.features;
    if (features.length < 10) {
      return DEFAULT_WEIGHTS;
    }

    const weights = this.calculateOptimalWeights(features);
    return { ...weights, version: generateVersionId() };
  }

  private calculateOptimalWeights(features: TrainingFeature[]): Omit<StrategyWeights, 'version'> {
    const totals = {
      capabilityMatch: 0,
      quality: 0,
      reliability: 0,
      costEfficiency: 0,
      latency: 0,
      availability: 0,
    };

    let totalWeight = 0;

    for (const f of features) {
      const success = !f.error && f.validationPassed;
      const weight = success ? 1 : 0.1;

      totals.capabilityMatch += weight * (f.qualityScore || 0.5);
      totals.quality += weight * (f.qualityScore || 0.5);
      totals.reliability += weight * (f.validationPassed ? 1 : 0);
      totals.costEfficiency += weight * (1 / (f.cost + 0.001));
      totals.latency += weight * (1 / (f.latencyMs + 1));
      totals.availability += weight * (f.fallbackUsed ? 0.5 : 1);

      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return { capabilityMatch: 0.30, quality: 0.25, reliability: 0.15, costEfficiency: 0.15, latency: 0.10, availability: 0.05 };
    }

    return {
      capabilityMatch: totals.capabilityMatch / totalWeight,
      quality: totals.quality / totalWeight,
      reliability: totals.reliability / totalWeight,
      costEfficiency: totals.costEfficiency / totalWeight,
      latency: totals.latency / totalWeight,
      availability: totals.availability / totalWeight,
    };
  }

  async simulateStrategy(weights: StrategyWeights, dataset: TrainingData): Promise<SimulationResult> {
    const features = dataset.features;
    if (features.length === 0) {
      return this.emptySimulation(weights.version);
    }

    let successCount = 0;
    let totalLatency = 0;
    let totalCost = 0;
    let totalTokens = 0;
    let totalQuality = 0;
    let fallbackCount = 0;
    let errorCount = 0;

    const perProvider: Record<string, ProviderSimulationResult> = {};
    const perModel: Record<string, ModelSimulationResult> = {};

    for (const f of features) {
      const score = this.scoreWithWeights(f, weights);
      const predictedSuccess = score > 0.5;

      if (predictedSuccess) successCount++;
      if (f.fallbackUsed) fallbackCount++;
      if (f.error) errorCount++;

      totalLatency += f.latencyMs;
      totalCost += f.cost;
      totalTokens += f.tokensUsed;
      totalQuality += f.qualityScore || 0.5;

      if (!perProvider[f.provider]) {
        perProvider[f.provider] = { requests: 0, successRate: 0, avgLatencyMs: 0, avgCost: 0 };
      }
      perProvider[f.provider].requests++;
      perProvider[f.provider].avgLatencyMs += f.latencyMs;
      perProvider[f.provider].avgCost += f.cost;

      if (!perModel[f.model]) {
        perModel[f.model] = { requests: 0, successRate: 0, avgLatencyMs: 0, avgCost: 0, avgQuality: 0 };
      }
      perModel[f.model].requests++;
      perModel[f.model].avgLatencyMs += f.latencyMs;
      perModel[f.model].avgCost += f.cost;
      perModel[f.model].avgQuality += f.qualityScore || 0.5;
    }

    const n = features.length;
    for (const p of Object.values(perProvider)) {
      p.successRate = p.requests > 0 ? successCount / n : 0;
      p.avgLatencyMs /= p.requests;
      p.avgCost /= p.requests;
    }
    for (const m of Object.values(perModel)) {
      m.successRate = m.requests > 0 ? successCount / n : 0;
      m.avgLatencyMs /= m.requests;
      m.avgCost /= m.requests;
      m.avgQuality /= m.requests;
    }

    return {
      strategyVersion: weights.version,
      totalDecisions: n,
      successRate: successCount / n,
      avgLatencyMs: totalLatency / n,
      avgCost: totalCost / n,
      avgTokens: totalTokens / n,
      avgQuality: totalQuality / n,
      fallbackRate: fallbackCount / n,
      errorRate: errorCount / n,
      costEfficiency: 1 - (totalCost / n) / (Math.max(...features.map(f => f.cost)) + 0.001),
      latencyEfficiency: 1 - (totalLatency / n) / (Math.max(...features.map(f => f.latencyMs)) + 1),
      qualityEfficiency: (totalQuality / n) / (Math.max(...features.map(f => f.qualityScore || 0.5)) || 1),
      perProvider,
      perModel,
    };
  }

  private scoreWithWeights(feature: TrainingFeature, weights: StrategyWeights): number {
    return (
      weights.capabilityMatch * (feature.qualityScore || 0.5) +
      weights.quality * (feature.qualityScore || 0.5) +
      weights.reliability * (feature.validationPassed ? 1 : 0) +
      weights.costEfficiency * (1 / (feature.cost + 0.001)) +
      weights.latency * (1 / (feature.latencyMs + 1)) +
      weights.availability * (feature.fallbackUsed ? 0.5 : 1)
    );
  }

  private emptySimulation(version: string): SimulationResult {
    return {
      strategyVersion: version,
      totalDecisions: 0,
      successRate: 0,
      avgLatencyMs: 0,
      avgCost: 0,
      avgTokens: 0,
      avgQuality: 0,
      fallbackRate: 0,
      errorRate: 0,
      costEfficiency: 0,
      latencyEfficiency: 0,
      qualityEfficiency: 0,
      perProvider: {},
      perModel: {},
    };
  }

  async promoteStrategy(version: string): Promise<void> {
    const strategy = this.strategyVersions.get(version);
    if (!strategy) throw new Error(`Strategy version ${version} not found`);
    if (strategy.status !== 'simulated' && strategy.status !== 'draft') {
      throw new Error(`Strategy ${version} not ready for promotion (status: ${strategy.status})`);
    }

    const sql = getSql();
    if (sql) {
      await sql`
        UPDATE strategy_versions
        SET status = 'active', promoted_at = ${new Date().toISOString()}
        WHERE version = ${version}
      `;
      await sql`
        UPDATE strategy_versions
        SET status = 'archived'
        WHERE version = ${this.currentVersion} AND version != ${version}
      `;
    }

    const oldVersion = this.currentVersion;
    this.currentVersion = version;
    strategy.status = 'active';
    strategy.promotedAt = new Date().toISOString();

    if (oldVersion !== version) {
      const oldStrategy = this.strategyVersions.get(oldVersion);
      if (oldStrategy) {
        oldStrategy.status = 'archived';
        oldStrategy.rolledBackAt = new Date().toISOString();
      }
    }
  }

  async rollbackStrategy(version: string): Promise<void> {
    const strategy = this.strategyVersions.get(version);
    if (!strategy) throw new Error(`Strategy version ${version} not found`);

    const sql = getSql();
    if (sql) {
      await sql`
        UPDATE strategy_versions
        SET status = 'rolled_back', rolled_back_at = ${new Date().toISOString()}
        WHERE version = ${version}
      `;
      if (this.currentVersion === version) {
        const parentVersion = strategy.parentVersion || 'default';
        await this.promoteStrategy(parentVersion);
      }
    }

    strategy.status = 'rolled_back';
    strategy.rolledBackAt = new Date().toISOString();
  }

  async createStrategyVersion(weights: StrategyWeights, parentVersion?: string): Promise<StrategyVersion> {
    const version = weights.version || generateVersionId();
    const sql = getSql();

    const newVersion: StrategyVersion = {
      version,
      weights,
      status: 'draft',
      createdAt: new Date().toISOString(),
      parentVersion: parentVersion || this.currentVersion,
    };

    this.strategyVersions.set(version, newVersion);

    if (sql) {
      await sql`
        INSERT INTO strategy_versions (
          version, weights, status, created_at, parent_version
        ) VALUES (
          ${version}, ${JSON.stringify(weights)}, 'draft', ${newVersion.createdAt}, ${newVersion.parentVersion}
        )
      `;
    }

    return newVersion;
  }

  async trainFromPending(): Promise<StrategyWeights | null> {
    if (this.pendingTrainingData.length < 10) return null;

    const dataset: TrainingData = {
      decisions: [],
      outcomes: [],
      features: [...this.pendingTrainingData],
    };
    this.pendingTrainingData = [];

    const weights = await this.trainStrategy(dataset);
    const simulation = await this.simulateStrategy(weights, dataset);

    const version = await this.createStrategyVersion(weights);
    version.status = 'simulated';
    version.simulationResult = simulation;

    if (simulation.successRate > 0.95 && simulation.errorRate < 0.05) {
      await this.promoteStrategy(version.version);
    }

    return weights;
  }

  getCurrentStrategy(): StrategyWeights {
    const strategy = this.strategyVersions.get(this.currentVersion);
    return strategy?.weights || DEFAULT_WEIGHTS;
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  getStrategyVersion(version: string): StrategyVersion | undefined {
    return this.strategyVersions.get(version);
  }

  listStrategyVersions(): StrategyVersion[] {
    return Array.from(this.strategyVersions.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  async loadFromDatabase(): Promise<void> {
    const sql = getSql();
    if (!sql) return;

    try {
      const rows = await sql`SELECT * FROM strategy_versions ORDER BY created_at DESC`;
      for (const row of rows) {
        this.strategyVersions.set(row.version as string, {
          version: row.version as string,
          weights: row.weights as StrategyWeights,
          status: row.status as StrategyStatus,
          createdAt: row.created_at as string,
          promotedAt: row.promoted_at as string | undefined,
          rolledBackAt: row.rolled_back_at as string | undefined,
          parentVersion: row.parent_version as string | undefined,
          trainingDataHash: row.training_data_hash as string | undefined,
          simulationResult: row.simulation_result as SimulationResult | undefined,
        });
        if (row.status === 'active') {
          this.currentVersion = row.version as string;
        }
      }
    } catch {
      // Non-blocking
    }
  }
}

export const selfLearning = new SelfLearningEngine();