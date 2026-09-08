import type { BoilerplateRule } from './types';

export const DEFAULT_BOILERPLATE_RULES: BoilerplateRule[] = [
  {
    id: 'bp-could-you-please',
    pattern: /(?:^|\s)Could you please(?:\s+[^.?!]*)?[.?!]?\s*/gi,
    replacement: '',
    confidence: 'HIGH',
  },
  {
    id: 'bp-i-would-like-you-to',
    pattern: /(?:^|\s)I would like you to(?:\s+[^.?!]*)?[.?!]?\s*/gi,
    replacement: '',
    confidence: 'HIGH',
  },
  {
    id: 'bp-i-need-you-to',
    pattern: /(?:^|\s)I need you to(?:\s+[^.?!]*)?[.?!]?\s*/gi,
    replacement: '',
    confidence: 'HIGH',
  },
  {
    id: 'bp-please',
    pattern: /(?:^|\s)Please(?:\s+[^.?!]*)?[.?!]?\s*/gi,
    replacement: '',
    confidence: 'HIGH',
  },
  {
    id: 'bp-kindly',
    pattern: /(?:^|\s)Kindly(?:\s+[^.?!]*)?[.?!]?\s*/gi,
    replacement: '',
    confidence: 'HIGH',
  },
  {
    id: 'bp-would-you-mind',
    pattern: /(?:^|\s)Would you mind(?:\s+[^.?!]*)?[.?!]?\s*/gi,
    replacement: '',
    confidence: 'HIGH',
  },
  {
    id: 'bp-i-want-you-to',
    pattern: /(?:^|\s)I want you to(?:\s+[^.?!]*)?[.?!]?\s*/gi,
    replacement: '',
    confidence: 'HIGH',
  },
  {
    id: 'bp-as-you-know',
    pattern: /(?:^|\s)As you know,?\s*/gi,
    replacement: '',
    confidence: 'HIGH',
  },
];

export interface BoilerplateResult {
  original: string;
  optimized: string;
  tokensSaved: number;
  applied: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

const CHARS_PER_TOKEN = 4;

export function detectBoilerplate(text: string, rules: BoilerplateRule[] = DEFAULT_BOILERPLATE_RULES): BoilerplateResult {
  let optimized = text;
  let applied = false;
  let minConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';

  for (const rule of rules) {
    const before = optimized;
    optimized = optimized.replace(rule.pattern, rule.replacement);
    if (optimized !== before) {
      applied = true;
      if (rule.confidence === 'LOW') minConfidence = 'LOW';
      else if (rule.confidence === 'MEDIUM' && minConfidence !== 'LOW') minConfidence = 'MEDIUM';
    }
  }

  optimized = optimized.replace(/\s+/g, ' ').trim();

  const originalTokens = Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN));
  const optimizedTokens = Math.max(1, Math.ceil(optimized.length / CHARS_PER_TOKEN));
  const tokensSaved = Math.max(0, originalTokens - optimizedTokens);

  return { original: text, optimized, tokensSaved, applied, confidence: minConfidence };
}
