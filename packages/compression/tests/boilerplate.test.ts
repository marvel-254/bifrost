import { detectBoilerplate, DEFAULT_BOILERPLATE_RULES } from '../src/boilerplate';

describe('detectBoilerplate', () => {
  test('removes leading boilerplate phrases', () => {
    const result = detectBoilerplate('Could you please review this code?');
    expect(result.applied).toBe(true);
    expect(result.tokensSaved).toBeGreaterThan(0);
  });

  test('removes multiple boilerplate instances', () => {
    const result = detectBoilerplate('Please analyze this. Please summarize that.');
    expect(result.applied).toBe(true);
  });

  test('preserves actual instructions', () => {
    const result = detectBoilerplate('Be concise and use bullet points.');
    expect(result.applied).toBe(false);
    expect(result.optimized).toBe('Be concise and use bullet points.');
  });

  test('returns HIGH confidence for default rules', () => {
    const result = detectBoilerplate('Could you please help me?');
    expect(result.confidence).toBe('HIGH');
  });

  test('does not break empty string', () => {
    const result = detectBoilerplate('');
    expect(result.applied).toBe(false);
    expect(result.optimized).toBe('');
  });

  test('normalizes whitespace', () => {
    const result = detectBoilerplate('Please   analyze    this');
    expect(result.optimized).not.toMatch(/\s{2,}/);
  });
});
