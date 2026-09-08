import { canonicalizePrompt } from '../src/canonicalize';

describe('canonicalizePrompt', () => {
  test('maps find/look/identify bugs to FIND_ISSUES', () => {
    const result = canonicalizePrompt('Find bugs in this code.');
    expect(result.operation).toBe('FIND_ISSUES');
    expect(result.applied).toBe(true);
  });

  test('maps analyze phrases to ANALYZE', () => {
    const result = canonicalizePrompt('Analyze this system.');
    expect(result.operation).toBe('ANALYZE');
    expect(result.applied).toBe(true);
  });

  test('maps review phrases to REVIEW', () => {
    const result = canonicalizePrompt('Review this code and give feedback.');
    expect(result.operation).toBe('REVIEW');
    expect(result.applied).toBe(true);
  });

  test('maps summarize phrases to SUMMARIZE', () => {
    const result = canonicalizePrompt('Summarize the following text.');
    expect(result.operation).toBe('SUMMARIZE');
    expect(result.applied).toBe(true);
  });

  test('returns null operation for unknown prompts', () => {
    const result = canonicalizePrompt('Hello, how are you today?');
    expect(result.operation).toBeNull();
    expect(result.applied).toBe(false);
  });

  test('reports HIGH confidence', () => {
    const result = canonicalizePrompt('Compare these two approaches.');
    expect(result.confidence).toBe('HIGH');
  });

  test('calculates tokens saved', () => {
    const result = canonicalizePrompt('Find bugs in the provided code.');
    expect(result.tokensSaved).toBeGreaterThanOrEqual(0);
  });
});
