import { createHash } from 'crypto';
import type { NormalizedRequest, ChatTool, NormalizedMessage } from '@bifrost/shared';
import type { NormalizedRequestForCache } from './types';

export interface SemanticFingerprintConfig {
  includeTaskType: boolean;
  includeInstructions: boolean;
  includeToolSchemas: boolean;
  includeOutputSchema: boolean;
  includeSystemPrompt: boolean;
  ignoreUserMessageWording: boolean;
  ignoreExampleValues: boolean;
}

export const DEFAULT_SEMANTIC_CONFIG: SemanticFingerprintConfig = {
  includeTaskType: true,
  includeInstructions: true,
  includeToolSchemas: true,
  includeOutputSchema: true,
  includeSystemPrompt: true,
  ignoreUserMessageWording: true,
  ignoreExampleValues: true,
};

function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function hashObject(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return hashString(String(obj));
  }
  return hashString(JSON.stringify(obj, Object.keys(obj as object).sort()));
}

export function exactFingerprint(request: NormalizedRequestForCache): string {
  const normalized = {
    model: request.model,
    messages: request.messages.map((m) => ({
      role: m.role,
      content: m.content,
      name: m.name,
      tool_calls: m.tool_calls,
      tool_call_id: m.tool_call_id,
    })),
    temperature: request.temperature,
    top_p: request.top_p,
    max_tokens: request.max_tokens,
    stream: request.stream,
    stop: request.stop,
    tools: request.tools,
    tool_choice: request.tool_choice,
    user: request.user,
  };
  return hashObject(normalized);
}

function extractTaskType(messages: NormalizedMessage[]): string {
  const systemPrompt = messages.find((m) => m.role === 'system')?.content?.toLowerCase() || '';
  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content.toLowerCase());
  const allText = [systemPrompt, ...userMessages].join(' ');

  if (allText.includes('code') || allText.includes('program') || allText.includes('debug')) {
    return 'coding';
  }
  if (allText.includes('summarize') || allText.includes('summary')) {
    return 'summarization';
  }
  if (allText.includes('analyze') || allText.includes('analysis')) {
    return 'analysis';
  }
  if (allText.includes('creative') || allText.includes('write') || allText.includes('story')) {
    return 'creative';
  }
  if (allText.includes('reason') || allText.includes('logic') || allText.includes('think')) {
    return 'reasoning';
  }
  if (allText.includes('research') || allText.includes('investigate')) {
    return 'research';
  }
  if (allText.includes('tool') || allText.includes('function')) {
    return 'tool_use';
  }
  return 'general';
}

function extractInstructions(messages: NormalizedMessage[]): string {
  const systemMessages = messages.filter((m) => m.role === 'system');
  return systemMessages.map((m) => m.content).join('\n\n');
}

function extractToolSchemas(tools: ChatTool[] | undefined): string {
  if (!tools) return '';
  return tools
    .map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => JSON.stringify(t))
    .join('|');
}

function extractOutputSchema(tools: ChatTool[] | undefined): string {
  if (!tools) return '';
  const structuredOutputTool = tools.find(
    (t) => t.function.name.includes('output') || t.function.name.includes('schema') || t.function.name.includes('format')
  );
  if (!structuredOutputTool) return '';
  return JSON.stringify(structuredOutputTool.function.parameters);
}

function extractSystemPrompt(messages: NormalizedMessage[]): string {
  const systemMessages = messages.filter((m) => m.role === 'system');
  return systemMessages.map((m) => m.content).join('\n\n');
}

function extractUserMessageStructure(messages: NormalizedMessage[]): string {
  const userMessages = messages.filter((m) => m.role === 'user');
  return userMessages
    .map((m) => {
      let content = m.content;
      content = content.replace(/"[^"]*"/g, '"<VALUE>"');
      content = content.replace(/'[^']*'/g, "'<VALUE>'");
      content = content.replace(/\b\d+\b/g, '<NUM>');
      content = content.replace(/\b[A-Fa-f0-9]{8,}\b/g, '<HEX>');
      content = content.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, '<UUID>');
      return content;
    })
    .join('|');
}

export function semanticFingerprint(
  request: NormalizedRequestForCache,
  config: SemanticFingerprintConfig = DEFAULT_SEMANTIC_CONFIG
): string {
  const components: string[] = [];

  if (config.includeTaskType) {
    components.push(`task:${extractTaskType(request.messages)}`);
  }

  if (config.includeInstructions) {
    const instructions = extractInstructions(request.messages);
    if (instructions) {
      components.push(`instructions:${hashString(instructions)}`);
    }
  }

  if (config.includeToolSchemas) {
    const toolSchemas = extractToolSchemas(request.tools);
    if (toolSchemas) {
      components.push(`tools:${hashString(toolSchemas)}`);
    }
  }

  if (config.includeOutputSchema) {
    const outputSchema = extractOutputSchema(request.tools);
    if (outputSchema) {
      components.push(`output:${hashString(outputSchema)}`);
    }
  }

  if (config.includeSystemPrompt) {
    const systemPrompt = extractSystemPrompt(request.messages);
    if (systemPrompt) {
      components.push(`system:${hashString(systemPrompt)}`);
    }
  }

  if (config.ignoreUserMessageWording) {
    const userStructure = extractUserMessageStructure(request.messages);
    if (userStructure) {
      components.push(`user_structure:${hashString(userStructure)}`);
    }
  } else {
    const userMessages = request.messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('|');
    if (userMessages) {
      components.push(`user:${hashString(userMessages)}`);
    }
  }

  components.push(`model:${request.model}`);
  components.push(`temp:${request.temperature ?? 'default'}`);
  components.push(`top_p:${request.top_p ?? 'default'}`);
  components.push(`max_tokens:${request.max_tokens ?? 'default'}`);

  return hashString(components.join('|'));
}

export function computeFingerprints(
  request: NormalizedRequestForCache,
  semanticConfig?: SemanticFingerprintConfig
): { exact: string; semantic: string } {
  return {
    exact: exactFingerprint(request),
    semantic: semanticFingerprint(request, semanticConfig),
  };
}