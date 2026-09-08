import type { NormalizedMessage, NormalizedRequest } from '@bifrost/shared';
import type {
  CompressionLevel,
  CompressionConfig,
  CompressionPass,
  CompressionResult,
  CompressionEngineOptions,
  ContextItem,
  SafetyClassification,
} from './types';
import { analyzeRequest } from './analyzer';
import { detectBoilerplate } from './boilerplate';
import { canonicalizePrompt } from './canonicalize';
import { compressStructural } from './structural';
import { deduplicateContext } from './deduplicate';
import { pruneContext } from './prune';
import { compressToolOutput } from './tool-compression';

const DEFAULT_CONFIG: CompressionConfig = {
  contextWindow: 8192,
  reservedOutput: 1024,
  safetyMargin: 256,
  minConfidence: 'MEDIUM',
  levelThresholds: {
    0: 0,
    1: 0.25,
    2: 0.5,
    3: 0.7,
    4: 0.85,
    5: 0.95,
  },
  maxLevel: 5,
  maxProcessingMs: 50,
  enableBoilerplate: true,
  enableCanonicalization: true,
  enableStructural: true,
  enableDeduplication: true,
  enablePruning: true,
  enableToolCompression: true,
};

const CONFIDENCE_ORDER: Record<SafetyClassification, number> = {
  SAFE: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function resolveLevel(utilization: number, config: CompressionConfig): CompressionLevel {
  if (utilization < config.levelThresholds[0]) return 0;
  if (utilization < config.levelThresholds[1]) return 1;
  if (utilization < config.levelThresholds[2]) return 2;
  if (utilization < config.levelThresholds[3]) return 3;
  if (utilization < config.levelThresholds[4]) return 4;
  return 5;
}

function cloneRequest(request: NormalizedRequest): NormalizedRequest {
  return {
    ...request,
    messages: request.messages.map((m: NormalizedMessage) => ({ ...m, content: m.content ?? '' })),
    tools: request.tools ? request.tools.map(t => ({ ...t })) : undefined,
  };
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function countRequestTokens(request: NormalizedRequest): number {
  return request.messages.reduce((sum: number, m: NormalizedMessage) => sum + estimateTokens(m.content ?? ''), 0);
}

function meetsConfidence(confidence: SafetyClassification, minConfidence: SafetyClassification): boolean {
  return CONFIDENCE_ORDER[confidence] <= CONFIDENCE_ORDER[minConfidence];
}

export class CompressionEngine {
  private config: CompressionConfig;

  constructor(private options: CompressionEngineOptions, config?: Partial<CompressionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async compress(request: NormalizedRequest): Promise<CompressionResult> {
    const start = performance.now();
    const model = this.options.registry.getModel(request.model);
    const contextWindow = model?.contextWindow ?? this.config.contextWindow;
    const analysis = analyzeRequest(request, contextWindow);
    const requiredLevel = resolveLevel(analysis.utilizationRatio, this.config);

    let currentRequest = cloneRequest(request);
    const passes: CompressionPass[] = [];
    let fallbackUsed = false;

    const originalTokens = analysis.totalInputTokens;
    let optimizedTokens = originalTokens;
    let currentLevel: CompressionLevel = 0;

    try {
      if (requiredLevel >= 1 && this.config.enableBoilerplate) {
        const pass = this.runLevel1(currentRequest, analysis);
        passes.push(pass.pass);
        if (pass.applied) {
          currentRequest = pass.request;
          optimizedTokens = countRequestTokens(currentRequest);
          currentLevel = 1;
        }
        if (optimizedTokens <= analysis.availableBudget) {
          return this.finish(request, currentRequest, passes, start, optimizedTokens, originalTokens, currentLevel, fallbackUsed);
        }
      }

      if (requiredLevel >= 2 && this.config.enableCanonicalization && this.config.enableStructural) {
        const pass = this.runLevel2(currentRequest, analysis);
        passes.push(pass.pass);
        if (pass.applied) {
          currentRequest = pass.request;
          optimizedTokens = countRequestTokens(currentRequest);
          currentLevel = 2;
        }
        if (optimizedTokens <= analysis.availableBudget) {
          return this.finish(request, currentRequest, passes, start, optimizedTokens, originalTokens, currentLevel, fallbackUsed);
        }
      }

      if (requiredLevel >= 3 && this.config.enableDeduplication) {
        const pass = this.runLevel3(currentRequest, analysis);
        passes.push(pass.pass);
        if (pass.applied) {
          currentRequest = pass.request;
          optimizedTokens = countRequestTokens(currentRequest);
          currentLevel = 3;
        }
        if (optimizedTokens <= analysis.availableBudget) {
          return this.finish(request, currentRequest, passes, start, optimizedTokens, originalTokens, currentLevel, fallbackUsed);
        }
      }

      if (requiredLevel >= 4 && this.config.enablePruning) {
        const pass = this.runLevel4(currentRequest, analysis);
        passes.push(pass.pass);
        if (pass.applied) {
          currentRequest = pass.request;
          optimizedTokens = countRequestTokens(currentRequest);
          currentLevel = 4;
        }
        if (optimizedTokens <= analysis.availableBudget) {
          return this.finish(request, currentRequest, passes, start, optimizedTokens, originalTokens, currentLevel, fallbackUsed);
        }
      }

      if (requiredLevel >= 5 && this.config.enableToolCompression) {
        const pass = this.runLevel5(currentRequest, analysis);
        passes.push(pass.pass);
        if (pass.applied) {
          currentRequest = pass.request;
          optimizedTokens = countRequestTokens(currentRequest);
          currentLevel = 5;
        }
      }
    } catch {
      fallbackUsed = true;
      currentRequest = cloneRequest(request);
      passes.push({
        name: 'fallback',
        level: currentLevel as CompressionLevel,
        confidence: 'HIGH',
        inputTokens: originalTokens,
        outputTokens: originalTokens,
        tokensSaved: 0,
        transformations: ['restored original request due to validation failure'],
        applied: true,
        error: 'validation failure',
      });
      optimizedTokens = originalTokens;
      currentLevel = 0;
    }

    return this.finish(request, currentRequest, passes, start, optimizedTokens, originalTokens, currentLevel, fallbackUsed);
  }

  private runLevel1(request: NormalizedRequest, analysis: { availableBudget: number }) {
    let applied = false;
    const transformations: string[] = [];
    const messages = request.messages.map((m: NormalizedMessage) => {
      const result = detectBoilerplate(m.content ?? '');
      if (result.applied && meetsConfidence(result.confidence, this.config.minConfidence)) {
        applied = true;
        transformations.push(`boilerplate:${result.tokensSaved} saved`);
        return { ...m, content: result.optimized };
      }
      return m;
    });

    const pass: CompressionPass = {
      name: 'level1-boilerplate',
      level: 1 as CompressionLevel,
      confidence: 'HIGH' as SafetyClassification,
      inputTokens: analysis.availableBudget,
      outputTokens: analysis.availableBudget,
      tokensSaved: 0,
      transformations,
      applied,
    };

    return { pass, request: { ...request, messages }, applied };
  }

  private runLevel2(request: NormalizedRequest, analysis: { availableBudget: number }) {
    let applied = false;
    const transformations: string[] = [];
    const messages = request.messages.map((m: NormalizedMessage) => {
      const canonical = canonicalizePrompt(m.content ?? '');
      const structural = compressStructural(canonical.operation ? `[${canonical.operation}] ${m.content}` : m.content ?? '');
      let optimized = m.content ?? '';
      let saved = 0;

      if (canonical.applied && meetsConfidence(canonical.confidence, this.config.minConfidence)) {
        optimized = `[${canonical.operation}] ${optimized}`;
        saved += canonical.tokensSaved;
        transformations.push(`canonicalize:${canonical.operation}`);
        applied = true;
      }

      const beforeStructural = optimized;
      const structuralResult = compressStructural(optimized);
      if (structuralResult.applied && meetsConfidence(structuralResult.confidence, this.config.minConfidence)) {
        optimized = structuralResult.optimized;
        saved += structuralResult.tokensSaved;
        transformations.push(`structural:${structuralResult.tokensSaved} saved`);
        applied = true;
      } else if (!applied) {
        optimized = beforeStructural;
      }

      return { ...m, content: optimized };
    });

    const pass: CompressionPass = {
      name: 'level2-canonicalize-structural',
      level: 2 as CompressionLevel,
      confidence: 'HIGH' as SafetyClassification,
      inputTokens: analysis.availableBudget,
      outputTokens: analysis.availableBudget,
      tokensSaved: 0,
      transformations,
      applied,
    };

    return { pass, request: { ...request, messages }, applied };
  }

  private runLevel3(request: NormalizedRequest, analysis: { availableBudget: number }) {
    const contextItems: ContextItem[] = request.messages.map((m: NormalizedMessage, idx: number) => ({
      id: `msg-${idx}`,
      type: m.role as ContextItem['type'],
      content: m.content ?? '',
      tokens: estimateTokens(m.content ?? ''),
      age: Date.now() - idx * 1000,
      referenced: true,
      priority: 10,
      dependencies: [],
    }));

    const dedup = deduplicateContext(contextItems);
    let applied = false;
    const transformations: string[] = [];

    if (dedup.applied && meetsConfidence(dedup.confidence, this.config.minConfidence)) {
      applied = true;
      transformations.push(`dedup:${dedup.removedIds.length} removed, ${dedup.tokensSaved} saved`);

      const removeSet = new Set(dedup.removedIds);
      const messages = request.messages.filter((_: NormalizedMessage, idx: number) => !removeSet.has(`msg-${idx}`));
      const pass: CompressionPass = {
        name: 'level3-dedup',
        level: 3 as CompressionLevel,
        confidence: 'SAFE',
        inputTokens: analysis.availableBudget,
        outputTokens: analysis.availableBudget,
        tokensSaved: dedup.tokensSaved,
        transformations,
        applied: true,
      };
      return {
        pass,
        request: { ...request, messages },
        applied: true,
      };
    }

    const noPass: CompressionPass = {
      name: 'level3-dedup',
      level: 3 as CompressionLevel,
      confidence: 'SAFE',
      inputTokens: analysis.availableBudget,
      outputTokens: analysis.availableBudget,
      tokensSaved: 0,
      transformations,
      applied: false,
    };
    return {
      pass: noPass,
      request,
      applied: false,
    };
  }

  private runLevel4(request: NormalizedRequest, analysis: { availableBudget: number }) {
    const contextItems: ContextItem[] = request.messages.map((m: NormalizedMessage, idx: number) => ({
      id: `msg-${idx}`,
      type: m.role as ContextItem['type'],
      content: m.content ?? '',
      tokens: estimateTokens(m.content ?? ''),
      age: Date.now() - idx * 1000,
      referenced: true,
      priority: m.role === 'system' ? 1 : m.role === 'user' ? 2 : 5,
      dependencies: [],
    }));

    const prune = pruneContext(contextItems);
    let applied = false;
    const transformations: string[] = [];

    if (prune.applied && meetsConfidence(prune.confidence, this.config.minConfidence)) {
      applied = true;
      transformations.push(`prune:${prune.removedIds.length} removed, ${prune.tokensSaved} saved`);

      const removeSet = new Set(prune.removedIds);
      const messages = request.messages.filter((_: NormalizedMessage, idx: number) => !removeSet.has(`msg-${idx}`));
      const pass: CompressionPass = {
        name: 'level4-prune',
        level: 4 as CompressionLevel,
        confidence: 'MEDIUM',
        inputTokens: analysis.availableBudget,
        outputTokens: analysis.availableBudget,
        tokensSaved: prune.tokensSaved,
        transformations,
        applied: true,
      };
      return {
        pass,
        request: { ...request, messages },
        applied: true,
      };
    }

    const noPass: CompressionPass = {
      name: 'level4-prune',
      level: 4 as CompressionLevel,
      confidence: 'MEDIUM',
      inputTokens: analysis.availableBudget,
      outputTokens: analysis.availableBudget,
      tokensSaved: 0,
      transformations,
      applied: false,
    };
    return {
      pass: noPass,
      request,
      applied: false,
    };
  }

  private runLevel5(request: NormalizedRequest, analysis: { availableBudget: number }) {
    let applied = false;
    const transformations: string[] = [];
    const messages = request.messages.map((m: NormalizedMessage) => {
      const toolResult = compressToolOutput(m.content ?? '');
      if (toolResult.applied && meetsConfidence(toolResult.confidence, this.config.minConfidence)) {
        applied = true;
        transformations.push(`tool:${toolResult.toolType}:${toolResult.tokensSaved} saved`);
        return { ...m, content: toolResult.optimized };
      }
      return m;
    });

    const pass: CompressionPass = {
      name: 'level5-tool-compression',
      level: 5 as CompressionLevel,
      confidence: 'HIGH',
      inputTokens: analysis.availableBudget,
      outputTokens: analysis.availableBudget,
      tokensSaved: 0,
      transformations,
      applied,
    };

    return { pass, request: { ...request, messages }, applied };
  }

  private finish(
    original: NormalizedRequest,
    optimized: NormalizedRequest,
    passes: CompressionPass[],
    start: number,
    optimizedTokens: number,
    originalTokens: number,
    level: CompressionLevel,
    fallbackUsed: boolean,
  ): CompressionResult {
    const processingLatencyMs = performance.now() - start;
    const tokensSaved = Math.max(0, originalTokens - optimizedTokens);
    const compressionRatio = originalTokens > 0 ? optimizedTokens / originalTokens : 1;

    return {
      originalTokens,
      optimizedTokens,
      tokensSaved,
      compressionRatio,
      level,
      passes,
      processingLatencyMs,
      fallbackUsed,
      originalRequest: original,
      optimizedRequest: optimized,
    };
  }
}
