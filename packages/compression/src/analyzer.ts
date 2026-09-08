import type { NormalizedRequest, NormalizedMessage } from '@bifrost/shared';
import type { TokenAnalysis } from './types';

const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  if (!text) return 0;
  const len = text.length;
  if (len === 0) return 0;
  return Math.max(1, Math.ceil(len / CHARS_PER_TOKEN));
}

function roleTokens(role: string, text: string): number {
  const contentTokens = estimateTokens(text);
  const overhead = role.length + 10;
  return contentTokens + overhead;
}

export function analyzeRequest(request: NormalizedRequest, modelContextWindow: number): TokenAnalysis {
  let systemTokens = 0;
  let userTokens = 0;
  let assistantTokens = 0;
  let toolTokens = 0;
  let documentTokens = 0;

  for (const msg of request.messages) {
    const text = msg.content ?? '';
    switch (msg.role) {
      case 'system':
        systemTokens += roleTokens('system', text);
        break;
      case 'user':
        userTokens += roleTokens('user', text);
        break;
      case 'assistant':
        assistantTokens += roleTokens('assistant', text);
        break;
      case 'tool':
        toolTokens += roleTokens('tool', text);
        break;
      default:
        documentTokens += roleTokens(msg.role, text);
    }
  }

  const totalInputTokens = systemTokens + userTokens + assistantTokens + toolTokens + documentTokens;

  const reservedOutput = request.max_tokens ? Math.min(request.max_tokens, 4096) : 1024;
  const safetyMargin = 256;
  const contextWindow = Math.max(modelContextWindow, 1);
  const availableBudget = Math.max(contextWindow - reservedOutput - safetyMargin, 0);
  const utilizationRatio = availableBudget > 0 ? totalInputTokens / availableBudget : 1;

  return {
    totalInputTokens,
    systemTokens,
    userTokens,
    assistantTokens,
    toolTokens,
    documentTokens,
    estimatedOutputTokens: reservedOutput,
    contextWindow,
    reservedOutput,
    safetyMargin,
    availableBudget,
    utilizationRatio,
  };
}
