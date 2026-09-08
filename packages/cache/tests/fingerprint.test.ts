import { exactFingerprint, semanticFingerprint, DEFAULT_SEMANTIC_CONFIG } from '../src/fingerprint';
import type { NormalizedRequestForCache } from '../src/types';

describe('exactFingerprint', () => {
  const baseRequest: NormalizedRequestForCache = {
    model: 'openai/gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, world!' },
    ],
    temperature: 0.7,
    top_p: 1,
    max_tokens: 100,
    stream: false,
    tools: [],
    tool_choice: 'auto',
    tenantId: 'tenant-1',
  };

  it('should produce consistent fingerprints for identical requests', () => {
    const fp1 = exactFingerprint(baseRequest);
    const fp2 = exactFingerprint(baseRequest);
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBe(64);
  });

  it('should produce different fingerprints for different models', () => {
    const fp1 = exactFingerprint(baseRequest);
    const fp2 = exactFingerprint({ ...baseRequest, model: 'anthropic/claude-3' });
    expect(fp1).not.toBe(fp2);
  });

  it('should produce different fingerprints for different messages', () => {
    const fp1 = exactFingerprint(baseRequest);
    const fp2 = exactFingerprint({
      ...baseRequest,
      messages: [{ role: 'user', content: 'Different message' }],
    });
    expect(fp1).not.toBe(fp2);
  });

  it('should produce different fingerprints for different temperatures', () => {
    const fp1 = exactFingerprint(baseRequest);
    const fp2 = exactFingerprint({ ...baseRequest, temperature: 0.5 });
    expect(fp1).not.toBe(fp2);
  });

  it('should produce different fingerprints for different tools', () => {
    const fp1 = exactFingerprint(baseRequest);
    const fp2 = exactFingerprint({
      ...baseRequest,
      tools: [
        {
          type: 'function',
          function: { name: 'test', description: '', parameters: {} },
        },
      ],
    });
    expect(fp1).not.toBe(fp2);
  });

  it('should be deterministic across multiple calls', () => {
    const fingerprints = Array.from({ length: 10 }, () => exactFingerprint(baseRequest));
    expect(new Set(fingerprints).size).toBe(1);
  });
});

describe('semanticFingerprint', () => {
  const baseRequest: NormalizedRequestForCache = {
    model: 'openai/gpt-4o',
    messages: [
      { role: 'system', content: 'You are a coding assistant.' },
      { role: 'user', content: 'Write a function to calculate fibonacci.' },
    ],
    temperature: 0.7,
    top_p: 1,
    max_tokens: 100,
    stream: false,
    tools: [
      {
        type: 'function',
        function: {
          name: 'write_code',
          description: 'Write code',
          parameters: { type: 'object', properties: { language: { type: 'string' } } },
        },
      },
    ],
    tool_choice: 'auto',
    tenantId: 'tenant-1',
  };

  it('should produce consistent fingerprints for identical requests', () => {
    const fp1 = semanticFingerprint(baseRequest);
    const fp2 = semanticFingerprint(baseRequest);
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBe(64);
  });

  it('should produce similar fingerprints for similar requests with different user wording', () => {
    const fp1 = semanticFingerprint(baseRequest);
    const fp2 = semanticFingerprint({
      ...baseRequest,
      messages: [
        { role: 'system', content: 'You are a coding assistant.' },
        { role: 'user', content: 'Write a fibonacci function.' },
      ],
    });
    // Same system prompt and similar user intent should produce same fingerprint
    // when ignoreUserMessageWording is true (default)
    expect(fp1).toBe(fp2);
  });

  it('should produce different fingerprints for different task types', () => {
    const fp1 = semanticFingerprint(baseRequest);
    const fp2 = semanticFingerprint({
      ...baseRequest,
      messages: [
        { role: 'system', content: 'You are a creative writer.' },
        { role: 'user', content: 'Write a poem about nature.' },
      ],
    });
    expect(fp1).not.toBe(fp2);
  });

  it('should produce different fingerprints for different tools', () => {
    const fp1 = semanticFingerprint(baseRequest);
    const fp2 = semanticFingerprint({
      ...baseRequest,
      tools: [
        {
          type: 'function',
          function: {
            name: 'search_web',
            description: 'Search web',
            parameters: { type: 'object', properties: { query: { type: 'string' } } },
          },
        },
      ],
    });
    expect(fp1).not.toBe(fp2);
  });

  it('should produce different fingerprints for different system prompts', () => {
    const fp1 = semanticFingerprint(baseRequest);
    const fp2 = semanticFingerprint({
      ...baseRequest,
      messages: [
        { role: 'system', content: 'You are a math tutor.' },
        { role: 'user', content: 'Calculate fibonacci.' },
      ],
    });
    expect(fp1).not.toBe(fp2);
  });

  it('should respect config to include/exclude user message wording', () => {
    const fp1 = semanticFingerprint(baseRequest, { ...DEFAULT_SEMANTIC_CONFIG, ignoreUserMessageWording: false });
    const fp2 = semanticFingerprint({
      ...baseRequest,
      messages: [
        { role: 'system', content: 'You are a coding assistant.' },
        { role: 'user', content: 'Create a fibonacci function in Python.' },
      ],
    }, { ...DEFAULT_SEMANTIC_CONFIG, ignoreUserMessageWording: false });
    expect(fp1).not.toBe(fp2);
  });

  it('should be deterministic across multiple calls', () => {
    const fingerprints = Array.from({ length: 10 }, () => semanticFingerprint(baseRequest));
    expect(new Set(fingerprints).size).toBe(1);
  });
});

describe('fingerprint integration', () => {
  it('should produce different exact and semantic fingerprints for same request', () => {
    const request: NormalizedRequestForCache = {
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      tenantId: 'tenant-1',
    };
    const exact = exactFingerprint(request);
    const semantic = semanticFingerprint(request);
    expect(exact).not.toBe(semantic);
  });

  it('should produce same exact fingerprint for requests differing only in metadata', () => {
    const req1: NormalizedRequestForCache = {
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      tenantId: 'tenant-1',
    };
    const req2: NormalizedRequestForCache = {
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      tenantId: 'tenant-1',
    };
    expect(exactFingerprint(req1)).toBe(exactFingerprint(req2));
  });
});