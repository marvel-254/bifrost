import { NormalizedRequest } from '@bifrost/shared';

export type TrustScore = number & { readonly __brand: unique symbol };
export type CreditAmount = number & { readonly __brand: unique symbol };
export type TokenAmount = number & { readonly __brand: unique symbol };

export function trustScore(value: number): TrustScore {
  return value as TrustScore;
}

export function credits(value: number): CreditAmount {
  return value as CreditAmount;
}

export function tokens(value: number): TokenAmount {
  return value as TokenAmount;
}

export interface MarketplaceOffer {
  id: string;
  provider: string;
  accountId: string;
  capacityPerDay: TokenAmount;
  pricePerToken: number;
  trustScore: TrustScore;
  limits: OfferLimits;
  creditsBalance: CreditAmount;
  status: OfferStatus;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface OfferLimits {
  maxTokensPerRequest: TokenAmount;
  maxRequestsPerMinute: number;
  allowedModels?: string[];
  disallowedModels?: string[];
  allowedTenants?: string[];
  requiredCapabilities?: string[];
  minContextWindow?: number;
}

export type OfferStatus = 'active' | 'paused' | 'exhausted' | 'revoked' | 'pending_verification';

export interface MarketplaceConsumption {
  id: string;
  tenantId: string;
  offerId: string;
  tokensUsed: TokenAmount;
  creditsSpent: CreditAmount;
  requestId: string;
  model: string;
  provider: string;
  status: ConsumptionStatus;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export type ConsumptionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface ConsumptionResult {
  success: boolean;
  consumptionId?: string;
  tokensAllocated: TokenAmount;
  creditsCharged: CreditAmount;
  offerId?: string;
  error?: string;
  fallbackUsed?: boolean;
}

export interface CreateOfferInput {
  provider: string;
  accountId: string;
  capacityPerDay: TokenAmount;
  pricePerToken: number;
  trustScore: TrustScore;
  limits: OfferLimits;
  initialCredits: CreditAmount;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

export interface CredentialBroker {
  getCredentials(offerId: string): Promise<ProviderCredentials | null>;
  storeCredentials(offerId: string, credentials: ProviderCredentials): Promise<void>;
  revokeCredentials(offerId: string): Promise<void>;
  rotateCredentials(offerId: string, newCredentials: ProviderCredentials): Promise<void>;
}

export interface ProviderCredentials {
  apiKey: string;
  provider: string;
  accountId: string;
  encrypted: boolean;
  expiresAt?: string;
}

export interface TenantMarketplaceConfig {
  tenantId: string;
  optedIn: boolean;
  maxCreditsPerRequest: CreditAmount;
  allowedProviders?: string[];
  disallowedProviders?: string[];
  trustThreshold: TrustScore;
  autoApproveBelowThreshold: boolean;
}

export interface RoutingDecision {
  id: string;
  requestId: string;
  primary: RoutingCandidate | null;
  fallbacks: RoutingCandidate[];
  strategy: string;
  strategyVersion: string;
  weights: StrategyWeights;
  constraints: RoutingConstraints;
  reasoning: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface RoutingCandidate {
  model: string;
  provider: string;
  qualityScore: number;
  costScore: number;
  latencyScore: number;
  reliabilityScore: number;
  availabilityScore: number;
  priority: number;
  capabilities: string[];
  contextWindow: number;
  estimatedCost?: number;
  estimatedLatencyMs?: number;
}

export interface RoutingConstraints {
  requiredCapabilities?: string[];
  minContextWindow?: number;
  maxCostPerRequest?: number;
  disabledProviders?: string[];
  disabledModels?: string[];
  userRestrictions?: string[];
}

export interface StrategyWeights {
  capabilityMatch: number;
  quality: number;
  reliability: number;
  costEfficiency: number;
  latency: number;
  availability: number;
  version: string;
  metadata?: Record<string, unknown>;
}

export interface RoutingOutcome {
  decisionId: string;
  success: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  tokensUsed: TokenAmount;
  cost: number;
  costType: 'exact' | 'estimated' | 'unknown';
  error?: string;
  fallbackUsed: boolean;
  fallbackAttempt?: number;
  validationPassed: boolean;
  qualityScore?: number;
  timestamp: string;
}

export interface TrainingData {
  decisions: RoutingDecision[];
  outcomes: RoutingOutcome[];
  features: TrainingFeature[];
  metadata?: Record<string, unknown>;
}

export interface TrainingFeature {
  requestType: string;
  model: string;
  provider: string;
  accountId?: string;
  compressionUsed: boolean;
  latencyMs: number;
  tokensUsed: TokenAmount;
  cost: number;
  error: boolean;
  fallbackUsed: boolean;
  validationPassed: boolean;
  qualityScore?: number;
}

export interface SimulationResult {
  strategyVersion: string;
  totalDecisions: number;
  successRate: number;
  avgLatencyMs: number;
  avgCost: number;
  avgTokens: number;
  avgQuality: number;
  fallbackRate: number;
  errorRate: number;
  costEfficiency: number;
  latencyEfficiency: number;
  qualityEfficiency: number;
  perProvider: Record<string, ProviderSimulationResult>;
  perModel: Record<string, ModelSimulationResult>;
  metadata?: Record<string, unknown>;
}

export interface ProviderSimulationResult {
  requests: number;
  successRate: number;
  avgLatencyMs: number;
  avgCost: number;
}

export interface ModelSimulationResult {
  requests: number;
  successRate: number;
  avgLatencyMs: number;
  avgCost: number;
  avgQuality: number;
}

export interface StrategyVersion {
  version: string;
  weights: StrategyWeights;
  status: StrategyStatus;
  createdAt: string;
  promotedAt?: string;
  rolledBackAt?: string;
  parentVersion?: string;
  trainingDataHash?: string;
  simulationResult?: SimulationResult;
  metadata?: Record<string, unknown>;
}

export type StrategyStatus = 'draft' | 'simulated' | 'promoted' | 'active' | 'rolled_back' | 'archived';

export interface ContextItem {
  id: string;
  requestId: string;
  type: ContextType;
  content: string;
  tokens: number;
  age: number;
  referenced: boolean;
  priority: number;
  dependencies: string[];
  provenance: Provenance;
  invariants: Invariant[];
  metadata?: Record<string, unknown>;
}

export type ContextType =
  | 'system'
  | 'user'
  | 'assistant'
  | 'tool'
  | 'document'
  | 'retrieval'
  | 'constraint'
  | 'metadata'
  | 'error';

export interface Provenance {
  source: string;
  toolId?: string;
  documentId?: string;
  timestamp: string;
  author?: string;
  version?: string;
}

export interface Invariant {
  id: string;
  type: InvariantType;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  validator?: (item: ContextItem) => boolean;
}

export type InvariantType =
  | 'referential_integrity'
  | 'semantic_consistency'
  | 'format_validity'
  | 'dependency_order'
  | 'token_budget'
  | 'security_boundary';

export interface ContextEdge {
  from: string;
  to: string;
  type: EdgeType;
  weight: number;
  provenance: Provenance;
  invariants: Invariant[];
  metadata?: Record<string, unknown>;
}

export type EdgeType =
  | 'references'
  | 'depends_on'
  | 'supersedes'
  | 'derived_from'
  | 'constrains'
  | 'validates'
  | 'conflicts_with';

export interface ContextGraph {
  requestId: string;
  nodes: Map<string, ContextItem>;
  edges: ContextEdge[];
  roots: string[];
  leaves: string[];
  metadata?: Record<string, unknown>;
}

export interface GCandidate {
  itemId: string;
  reason: GCReason;
  confidence: number;
  estimatedTokensSaved: TokenAmount;
  dependencies: string[];
  dependents: string[];
  safeToRemove: boolean;
  archivePriority: number;
}

export type GCReason =
  | 'stale'
  | 'duplicate'
  | 'superseded'
  | 'unreferenced_tool_output'
  | 'obsolete_conversation_state'
  | 'redundant_retrieval'
  | 'token_budget_exceeded'
  | 'low_priority';

export interface GCConfig {
  stalenessThresholdMs: number;
  duplicateThreshold: number;
  supersessionEnabled: boolean;
  tokenBudgetThreshold: number;
  minArchivePriority: number;
  maxCandidatesPerRun: number;
}

export interface ContextArchive {
  id: string;
  requestId: string;
  item: ContextItem;
  archivedAt: string;
  reason: GCReason;
  originalGraphEdges: ContextEdge[];
  recoverable: boolean;
  metadata?: Record<string, unknown>;
}

export interface ActiveContext {
  requestId: string;
  items: ContextItem[];
  graph: ContextGraph;
  tokenBudget: TokenAmount;
  usedTokens: TokenAmount;
  lastUpdated: string;
}

export interface ArchivedContext {
  requestId: string;
  items: ContextArchive[];
  totalTokens: TokenAmount;
  lastArchived: string;
}

export interface RecoveryResult {
  success: boolean;
  items: ContextItem[];
  errors: RecoveryError[];
  tokensRestored: TokenAmount;
}

export interface RecoveryError {
  itemId: string;
  error: string;
  recoverable: boolean;
}

export interface MarketplaceAdminOfferRequest {
  provider: string;
  accountId: string;
  capacityPerDay: number;
  pricePerToken: number;
  trustScore: number;
  limits: OfferLimits;
  initialCredits: number;
  tenantId: string;
}

export interface MarketplaceAdminConsumptionResponse {
  consumptions: MarketplaceConsumption[];
  totalCreditsSpent: number;
  totalTokensUsed: number;
  byTenant: Record<string, { credits: number; tokens: number }>;
  byProvider: Record<string, { credits: number; tokens: number }>;
  byOffer: Record<string, { credits: number; tokens: number }>;
}