export type CompressionLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type ContextType = 'system' | 'user' | 'assistant' | 'tool' | 'document' | 'retrieval' | 'metadata';

export type SafetyClassification = 'SAFE' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CanonicalOperation =
  | 'ANALYZE'
  | 'REVIEW'
  | 'COMPARE'
  | 'SUMMARIZE'
  | 'EXTRACT'
  | 'CLASSIFY'
  | 'GENERATE'
  | 'TRANSFORM'
  | 'VALIDATE'
  | 'FIND_ISSUES'
  | 'EXPLAIN'
  | 'RANK'
  | 'FILTER';

export interface ContextItem {
  id: string;
  type: ContextType;
  content: string;
  tokens: number;
  age: number;
  referenced: boolean;
  priority: number;
  dependencies: string[];
}

export interface BoilerplateRule {
  id: string;
  pattern: RegExp;
  replacement: string;
  confidence: SafetyClassification;
}

export interface TokenAnalysis {
  totalInputTokens: number;
  systemTokens: number;
  userTokens: number;
  assistantTokens: number;
  toolTokens: number;
  documentTokens: number;
  estimatedOutputTokens: number;
  contextWindow: number;
  reservedOutput: number;
  safetyMargin: number;
  availableBudget: number;
  utilizationRatio: number;
}

export interface CompressionConfig {
  contextWindow: number;
  reservedOutput: number;
  safetyMargin: number;
  minConfidence: SafetyClassification;
  levelThresholds: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  maxLevel: CompressionLevel;
  maxProcessingMs: number;
  enableBoilerplate: boolean;
  enableCanonicalization: boolean;
  enableStructural: boolean;
  enableDeduplication: boolean;
  enablePruning: boolean;
  enableToolCompression: boolean;
}

export interface CompressionPass {
  name: string;
  level: CompressionLevel;
  confidence: SafetyClassification;
  inputTokens: number;
  outputTokens: number;
  tokensSaved: number;
  transformations: string[];
  applied: boolean;
  error?: string;
}

export interface CompressionResult {
  originalTokens: number;
  optimizedTokens: number;
  tokensSaved: number;
  compressionRatio: number;
  level: CompressionLevel;
  passes: CompressionPass[];
  processingLatencyMs: number;
  fallbackUsed: boolean;
  originalRequest: unknown;
  optimizedRequest: unknown;
}

export interface CompressionEngineOptions {
  registry: {
    getModel: (id: string) => { contextWindow: number } | undefined;
  };
  config?: Partial<CompressionConfig>;
}
