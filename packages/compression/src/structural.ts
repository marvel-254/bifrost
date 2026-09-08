import type { SafetyClassification } from './types';

export interface StructuralResult {
  original: string;
  optimized: string;
  tokensSaved: number;
  applied: boolean;
  confidence: SafetyClassification;
}

const CHARS_PER_TOKEN = 4;

function splitSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/g, '$1|SPLIT|')
    .split('|SPLIT|')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function classifySentence(sentence: string): 'task' | 'focus' | 'constraint' | 'input' | 'output' | 'priority' | 'prohibition' | 'format' | 'other' {
  const lower = sentence.toLowerCase();
  if (/^(constraint|constraints|rule|rules|requirement|requirements)\b/i.test(lower)) {
    return 'constraint';
  }
  if (/^(task|tasks|objective|objectives|goal|goals)\b/i.test(lower)) {
    return 'task';
  }
  if (/^(focus|focuses|focusing)\b/i.test(lower)) {
    return 'focus';
  }
  if (/^(input|inputs|given|provided|using|based on|source)\b/i.test(lower)) {
    return 'input';
  }
  if (/^(output|outputs|result|results|return|produce|deliver|conclusion|answer)\b/i.test(lower)) {
    return 'output';
  }
  if (/^(priority|priorities|important|importance)\b/i.test(lower)) {
    return 'priority';
  }
  if (/\b(don't|do not|never|avoid|must not|should not|no\b)/i.test(lower) && /\b(include|use|mention|output|print|show|display)\b/i.test(lower)) {
    return 'prohibition';
  }
  if (/\b(must|should|need to|required to|have to|ensure|make sure|always)\b/i.test(lower)) {
    return 'constraint';
  }
  if (/\b(format as|output as|return as|in json|in xml|markdown|bullet points|list|table)\b/i.test(lower)) {
    return 'format';
  }
  if (/\b(priority|first|second|third|most important|least important|focus on|prioritize)\b/i.test(lower)) {
    return 'priority';
  }
  if (/\b(analyze|review|compare|summarize|extract|classify|generate|transform|validate|find|explain|rank|filter)\b/i.test(lower)) {
    return 'task';
  }
  if (/\b(about|regarding|concerning|on|for|of|the)\b/i.test(lower) && lower.length > 20) {
    return 'focus';
  }
  return 'other';
}

export function compressStructural(text: string): StructuralResult {
  const sentences = splitSentences(text);
  const classified = sentences.map(s => ({ sentence: s, category: classifySentence(s) }));

  const task = classified.filter(c => c.category === 'task').map(c => c.sentence);
  const focus = classified.filter(c => c.category === 'focus').map(c => c.sentence);
  const constraints = classified.filter(c => c.category === 'constraint').map(c => c.sentence);
  const inputs = classified.filter(c => c.category === 'input').map(c => c.sentence);
  const outputs = classified.filter(c => c.category === 'output').map(c => c.sentence);
  const priorities = classified.filter(c => c.category === 'priority').map(c => c.sentence);
  const prohibitions = classified.filter(c => c.category === 'prohibition').map(c => c.sentence);
  const formats = classified.filter(c => c.category === 'format').map(c => c.sentence);

  const parts: string[] = [];
  if (task.length) parts.push(`TASK:\n${task.join(' ')}`);
  if (focus.length) parts.push(`FOCUS:\n${focus.join(' ')}`);
  if (inputs.length) parts.push(`INPUT:\n${inputs.join(' ')}`);
  if (constraints.length) parts.push(`CONSTRAINT:\n${constraints.join(' ')}`);
  if (priorities.length) parts.push(`PRIORITY:\n${priorities.join(' ')}`);
  if (prohibitions.length) parts.push(`PROHIBITION:\n${prohibitions.join(' ')}`);
  if (outputs.length) parts.push(`OUTPUT:\n${outputs.join(' ')}`);
  if (formats.length) parts.push(`FORMAT:\n${formats.join(' ')}`);

  const optimized = parts.length > 0 ? parts.join('\n\n') : text;
  const originalTokens = Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN));
  const optimizedTokens = Math.max(1, Math.ceil(optimized.length / CHARS_PER_TOKEN));
  const tokensSaved = Math.max(0, originalTokens - optimizedTokens);
  const applied = optimized !== text && optimized.length > 0;

  return { original: text, optimized, tokensSaved, applied, confidence: 'HIGH' };
}
