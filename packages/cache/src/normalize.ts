import type { NormalizedRequest, NormalizedMessage, ChatTool } from '@bifrost/shared';
import type { NormalizedRequestForCache } from './types';

const MODEL_ALIASES: Record<string, string> = {
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
  'claude-3-opus': 'anthropic/claude-3-opus',
  'claude-3-sonnet': 'anthropic/claude-3-sonnet',
  'claude-3-haiku': 'anthropic/claude-3-haiku',
  'gemini-1.5-pro': 'google/gemini-1.5-pro',
  'gemini-1.5-flash': 'google/gemini-1.5-flash',
  'llama-3.1-405b': 'meta/llama-3.1-405b',
  'llama-3.1-70b': 'meta/llama-3.1-70b',
  'llama-3.1-8b': 'meta/llama-3.1-8b',
  'mixtral-8x7b': 'mistral/mixtral-8x7b',
  'mixtral-8x22b': 'mistral/mixtral-8x22b',
};

function canonicalizeModel(model: string): string {
  const lower = model.toLowerCase().trim();
  return MODEL_ALIASES[lower] || model;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sortMessagesDeterministically(messages: NormalizedMessage[]): NormalizedMessage[] {
  return [...messages].sort((a, b) => {
    const roleOrder: Record<string, number> = { system: 0, user: 1, assistant: 2, tool: 3 };
    const aRole = roleOrder[a.role] ?? 4;
    const bRole = roleOrder[b.role] ?? 4;
    if (aRole !== bRole) return aRole - bRole;
    return a.content.localeCompare(b.content);
  });
}

function normalizeTools(tools: ChatTool[] | undefined): ChatTool[] | undefined {
  if (!tools) return undefined;
  return [...tools]
    .map((tool) => ({
      ...tool,
      function: {
        ...tool.function,
        parameters: JSON.parse(JSON.stringify(tool.function.parameters)),
      },
    }))
    .sort((a, b) => a.function.name.localeCompare(b.function.name));
}

export function normalizeRequest(request: NormalizedRequestForCache): NormalizedRequestForCache {
  const normalized: NormalizedRequestForCache = {
    ...request,
    model: canonicalizeModel(request.model),
    messages: request.messages.map((msg) => ({
      ...msg,
      content: normalizeWhitespace(msg.content),
    })),
    tools: normalizeTools(request.tools),
    temperature: request.temperature ?? undefined,
    top_p: request.top_p ?? undefined,
    max_tokens: request.max_tokens ?? undefined,
    stream: request.stream ?? undefined,
    stop: request.stop ?? undefined,
    tool_choice: request.tool_choice ?? undefined,
    user: request.user ?? undefined,
    metadata: undefined,
  };

  normalized.messages = sortMessagesDeterministically(normalized.messages);

  return normalized;
}

export function createCacheKey(
  tenantId: string,
  model: string,
  provider: string,
  fingerprint: string
): string {
  return `cache:${tenantId}:${model}:${provider}:${fingerprint}`;
}