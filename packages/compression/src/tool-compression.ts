import type { SafetyClassification } from './types';

export type ToolType = 'terminal' | 'logs' | 'git_diff' | 'json' | 'search_results' | 'db_results' | 'mcp' | 'web_content' | 'stack_trace' | 'unknown';

export interface ToolOutputResult {
  original: string;
  optimized: string;
  tokensSaved: number;
  applied: boolean;
  confidence: SafetyClassification;
  toolType: ToolType;
}

const CHARS_PER_TOKEN = 4;

function detectToolType(text: string): ToolType {
  const lower = text.toLowerCase();
  if (/^commit\s+[a-f0-9]+/m.test(text) || lower.includes('diff --git') || lower.includes('+++ b/') || lower.includes('--- a/')) {
    return 'git_diff';
  }
  if (/^\s*at\s+[\w.$]+\s*\(/m.test(text) || lower.includes('stack trace') || lower.includes('traceback')) {
    return 'stack_trace';
  }
  if (/^\s*(stdout|stderr|log|info|warn|error|debug)\s*[:\-]/.test(text) || /^\d{4}-\d{2}-\d{2}/m.test(text)) {
    return 'logs';
  }
  if (/^\s*(>|\$)\s/.test(text) || lower.includes('command not found') || lower.includes('exit code')) {
    return 'terminal';
  }
  if (/^\s*\{[\s\S]*\}\s*$/.test(text.trim()) || /^\s*\[[\s\S]*\]\s*$/.test(text.trim())) {
    return 'json';
  }
  if (/^\s*\d+\.\s/.test(text) || /^\s*-\s/.test(text) || lower.includes('results for') || lower.includes('found')) {
    return 'search_results';
  }
  if (/^\s*(select|insert|update|delete|create|alter|drop|with\s+recursive)\s+/i.test(text)) {
    return 'db_results';
  }
  if (lower.includes('<html') || lower.includes('<!doctype') || lower.includes('<body')) {
    return 'web_content';
  }
  if (lower.includes('mcp') || lower.includes('tool_call') || lower.includes('function_call')) {
    return 'mcp';
  }
  return 'unknown';
}

export function compressToolOutput(text: string): ToolOutputResult {
  const toolType = detectToolType(text);
  let optimized = text;
  let applied = false;
  let confidence: SafetyClassification = 'HIGH';

  switch (toolType) {
    case 'terminal': {
      const lines = text.split(/\n/);
      const keep: string[] = [];
      let lastPrompt = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^(>|\$)\s/.test(trimmed)) {
          lastPrompt = trimmed;
          keep.push(line);
        } else if (trimmed.length === 0) {
          keep.push(line);
        } else if (/error|exception|traceback|fatal|panic|failed/i.test(trimmed)) {
          keep.push(line);
        } else if (keep.length > 0 && keep[keep.length - 1].trim() === lastPrompt) {
          keep.push(line);
        }
      }
      optimized = keep.join('\n');
      if (optimized !== text) applied = true;
      break;
    }
    case 'logs': {
      const lines = text.split(/\n/);
      const keep: string[] = [];
      for (const line of lines) {
        if (/error|exception|traceback|fatal|panic|failed|warn/i.test(line) || line.trim().length === 0) {
          keep.push(line);
        }
      }
      if (keep.length === 0) {
        optimized = lines.slice(0, 5).join('\n');
      } else {
        optimized = keep.join('\n');
      }
      if (optimized !== text) applied = true;
      break;
    }
    case 'git_diff': {
      const lines = text.split(/\n/);
      const files: string[] = [];
      const hunks: string[] = [];
      let currentFile = '';
      for (const line of lines) {
        if (line.startsWith('diff --git ')) {
          currentFile = line;
          files.push(line);
        } else if (line.startsWith('@@')) {
          hunks.push(line);
        } else if (/^[+-]/.test(line) && !line.startsWith('+++') && !line.startsWith('---')) {
          hunks.push(line);
        }
      }
      optimized = [...files, ...hunks].join('\n');
      if (optimized !== text) applied = true;
      break;
    }
    case 'json': {
      try {
        const parsed = JSON.parse(text);
        optimized = JSON.stringify(parsed, (key, value) => {
          if (typeof value === 'string' && value.length > 1000) return value.slice(0, 1000) + '...';
          if (typeof value === 'object' && value !== null && Array.isArray(value) && value.length > 50) return value.slice(0, 50);
          return value;
        }, 2);
        if (optimized !== text) applied = true;
      } catch {
        confidence = 'MEDIUM';
      }
      break;
    }
    case 'stack_trace': {
      const lines = text.split(/\n/);
      const keep: string[] = [];
      for (const line of lines) {
        if (/^\s*at\s+[\w.$]+\s*\(/.test(line) || /^\s*Error:/.test(line) || /^\s*Caused by:/.test(line)) {
          keep.push(line);
        }
      }
      optimized = keep.length > 0 ? keep.join('\n') : text;
      if (optimized !== text) applied = true;
      break;
    }
    case 'search_results': {
      const lines = text.split(/\n/);
      const keep = lines.slice(0, 20);
      optimized = keep.join('\n');
      if (keep.length < lines.length) applied = true;
      break;
    }
    case 'db_results': {
      const lines = text.split(/\n/);
      const keep = lines.slice(0, 50);
      optimized = keep.join('\n');
      if (keep.length < lines.length) applied = true;
      break;
    }
    case 'web_content': {
      optimized = text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (optimized !== text) applied = true;
      break;
    }
    case 'mcp': {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          optimized = JSON.stringify(parsed.slice(0, 10), null, 2);
        } else {
          optimized = JSON.stringify(parsed, (key, value) => {
            if (typeof value === 'string' && value.length > 500) return value.slice(0, 500) + '...';
            return value;
          }, 2);
        }
        if (optimized !== text) applied = true;
      } catch {
        confidence = 'MEDIUM';
      }
      break;
    }
    default:
      confidence = 'LOW';
  }

  const originalTokens = Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN));
  const optimizedTokens = Math.max(1, Math.ceil(optimized.length / CHARS_PER_TOKEN));
  const tokensSaved = Math.max(0, originalTokens - optimizedTokens);

  return { original: text, optimized, tokensSaved, applied, confidence, toolType };
}
