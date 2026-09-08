import { normalizeRequest, createCacheKey } from '../src/normalize';
import { NormalizedRequest } from '@bifrost/shared';

describe('normalizeRequest', () => {
  const baseRequest: NormalizedRequest = {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: '  You are a helpful assistant.  ' },
      { role: 'user', content: 'Hello,  world!  ' },
      { role: 'assistant', content: 'Hi there!' },
    ],
    temperature: 0.7,
    top_p: 1,
    max_tokens: 100,
    stream: false,
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get weather',
          parameters: { type: 'object', properties: {} },
        },
      },
    ],
    tool_choice: 'auto',
    user: 'user-123',
    metadata: { requestId: 'req-123', timestamp: '2024-01-01' },
  };

  it('should normalize whitespace in message content', () => {
    const normalized = normalizeRequest({ ...baseRequest, tenantId: 'tenant-1' });
    expect(normalized.messages[0].content).toBe('You are a helpful assistant.');
    expect(normalized.messages[1].content).toBe('Hello, world!');
  });

  it('should canonicalize model names', () => {
    const normalized = normalizeRequest({ ...baseRequest, model: 'gpt-4o', tenantId: 'tenant-1' });
    expect(normalized.model).toBe('openai/gpt-4o');
  });

  it('should strip metadata field', () => {
    const normalized = normalizeRequest({ ...baseRequest, tenantId: 'tenant-1' });
    expect(normalized.metadata).toBeUndefined();
  });

  it('should sort messages deterministically by role', () => {
    const request = {
      ...baseRequest,
      messages: [
        { role: 'user', content: 'B' },
        { role: 'system', content: 'A' },
        { role: 'assistant', content: 'C' },
      ],
      tenantId: 'tenant-1',
    };
    const normalized = normalizeRequest(request);
    expect(normalized.messages[0].role).toBe('system');
    expect(normalized.messages[1].role).toBe('user');
    expect(normalized.messages[2].role).toBe('assistant');
  });

  it('should sort tools by name', () => {
    const request = {
      ...baseRequest,
      tools: [
        { type: 'function', function: { name: 'z_tool', description: '', parameters: {} } },
        { type: 'function', function: { name: 'a_tool', description: '', parameters: {} } },
      ],
      tenantId: 'tenant-1',
    };
    const normalized = normalizeRequest(request);
    expect(normalized.tools?.[0].function.name).toBe('a_tool');
    expect(normalized.tools?.[1].function.name).toBe('z_tool');
  });

  it('should preserve tenantId', () => {
    const normalized = normalizeRequest({ ...baseRequest, tenantId: 'tenant-1' });
    expect(normalized.tenantId).toBe('tenant-1');
  });

  it('should handle missing optional fields', () => {
    const minimalRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      tenantId: 'tenant-1',
    };
    const normalized = normalizeRequest(minimalRequest);
    expect(normalized.model).toBe('openai/gpt-4o');
    expect(normalized.temperature).toBeUndefined();
    expect(normalized.tools).toBeUndefined();
  });

  it('should be deterministic', () => {
    const req1 = normalizeRequest({ ...baseRequest, tenantId: 'tenant-1' });
    const req2 = normalizeRequest({ ...baseRequest, tenantId: 'tenant-1' });
    expect(JSON.stringify(req1)).toBe(JSON.stringify(req2));
  });
});

describe('createCacheKey', () => {
  it('should create a consistent cache key', () => {
    const key1 = createCacheKey('tenant-1', 'openai/gpt-4o', 'openai', 'abc123');
    const key2 = createCacheKey('tenant-1', 'openai/gpt-4o', 'openai', 'abc123');
    expect(key1).toBe(key2);
    expect(key1).toBe('cache:tenant-1:openai/gpt-4o:openai:abc123');
  });

  it('should include all components', () => {
    const key = createCacheKey('tenant-2', 'anthropic/claude-3', 'anthropic', 'def456');
    expect(key).toContain('tenant-2');
    expect(key).toContain('anthropic/claude-3');
    expect(key).toContain('anthropic');
    expect(key).toContain('def456');
  });
});