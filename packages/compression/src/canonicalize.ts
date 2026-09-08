import type { CanonicalOperation, SafetyClassification } from './types';

interface CanonicalMapping {
  patterns: RegExp[];
  operation: CanonicalOperation;
  confidence: SafetyClassification;
}

const CANONICAL_MAPPINGS: CanonicalMapping[] = [
  {
    patterns: [
      /\bfind\s+bugs?\b/i,
      /\blook\s+for\s+bugs?\b/i,
      /\bidentify\s+bugs?\b/i,
      /\bdetect\s+bugs?\b/i,
      /\bsearch\s+for\s+bugs?\b/i,
      /\bpinpoint\s+bugs?\b/i,
    ],
    operation: 'FIND_ISSUES',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\banalyze\s+this\b/i,
      /\banalyze\s+the\b/i,
      /\banalyze\s+and\b/i,
      /\bperform\s+analysis\b/i,
      /\bdo\s+an?\s+analysis\b/i,
    ],
    operation: 'ANALYZE',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\breview\s+this\b/i,
      /\breview\s+the\b/i,
      /\bgive\s+feedback\s+on\b/i,
      /\bprovide\s+feedback\s+on\b/i,
      /\bcheck\s+this\b/i,
      /\binspect\s+this\b/i,
    ],
    operation: 'REVIEW',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\bcompare\s+the\b/i,
      /\bcompare\s+this\b/i,
      /\bdiff\s+the\b/i,
      /\bdifference\s+between\b/i,
      /\bcontrast\s+the\b/i,
    ],
    operation: 'COMPARE',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\bsummarize\s+this\b/i,
      /\bsummarize\s+the\b/i,
      /\bcreate\s+a\s+summary\b/i,
      /\bprovide\s+a\s+summary\b/i,
      /\bgive\s+a\s+summary\b/i,
      /\btl;dr\b/i,
      /\btldr\b/i,
    ],
    operation: 'SUMMARIZE',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\bextract\s+the\b/i,
      /\bextract\s+all\b/i,
      /\bpull\s+out\s+the\b/i,
      /\bget\s+the\s+key\b/i,
      /\bpull\s+the\s+key\b/i,
    ],
    operation: 'EXTRACT',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\bclassify\s+this\b/i,
      /\bcategorize\s+this\b/i,
      /\bsort\s+into\b/i,
      /\bgroup\s+by\b/i,
      /\btag\s+this\b/i,
    ],
    operation: 'CLASSIFY',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\bgenerate\s+a\b/i,
      /\bcreate\s+a\b/i,
      /\bwrite\s+a\b/i,
      /\bproduce\s+a\b/i,
      /\bcompose\s+a\b/i,
      /\bdraft\s+a\b/i,
    ],
    operation: 'GENERATE',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\btransform\s+this\b/i,
      /\bconvert\s+this\b/i,
      /\brewrite\s+this\b/i,
      /\brephrase\s+this\b/i,
      /\brestructure\s+this\b/i,
      /\bmodify\s+this\b/i,
    ],
    operation: 'TRANSFORM',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\bvalidate\s+this\b/i,
      /\bverify\s+this\b/i,
      /\bcheck\s+if\s+this\b/i,
      /\bconfirm\s+this\b/i,
      /\bensure\s+this\b/i,
      /\bassert\s+this\b/i,
    ],
    operation: 'VALIDATE',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\bexplain\s+this\b/i,
      /\bexplain\s+why\b/i,
      /\bwhy\s+does\b/i,
      /\bhow\s+does\b/i,
      /\bdescribe\s+how\b/i,
      /\btell\s+me\s+why\b/i,
      /\btell\s+me\s+how\b/i,
    ],
    operation: 'EXPLAIN',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\brank\s+these\b/i,
      /\brank\s+the\b/i,
      /\border\s+by\b/i,
      /\bsort\s+by\b/i,
      /\bprioritize\b/i,
      /\btop\s+\d+\b/i,
    ],
    operation: 'RANK',
    confidence: 'HIGH',
  },
  {
    patterns: [
      /\bfilter\s+the\b/i,
      /\bfilter\s+out\b/i,
      /\bremove\s+all\b/i,
      /\bexclude\s+the\b/i,
      /\bonly\s+keep\b/i,
      /\bselect\s+only\b/i,
    ],
    operation: 'FILTER',
    confidence: 'HIGH',
  },
];

export interface CanonicalizationResult {
  original: string;
  operation: CanonicalOperation | null;
  confidence: SafetyClassification;
  applied: boolean;
  tokensSaved: number;
}

export function canonicalizePrompt(text: string): CanonicalizationResult {
  let matchedOperation: CanonicalOperation | null = null;
  let matchedConfidence: SafetyClassification = 'HIGH';
  let matched = false;

  for (const mapping of CANONICAL_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(text)) {
        matched = true;
        matchedOperation = mapping.operation;
        matchedConfidence = mapping.confidence;
        break;
      }
    }
    if (matched) break;
  }

  const originalTokens = Math.max(1, Math.ceil(text.length / 4));
  let optimizedTokens = originalTokens;
  if (matched && matchedOperation) {
    optimizedTokens = matchedOperation.length + 8;
  }

  return {
    original: text,
    operation: matchedOperation,
    confidence: matchedConfidence,
    applied: matched,
    tokensSaved: matched ? Math.max(0, originalTokens - optimizedTokens) : 0,
  };
}
