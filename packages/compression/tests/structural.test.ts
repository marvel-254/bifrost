import { compressStructural } from '../src/structural';

describe('compressStructural', () => {
  test('converts verbose instructions to compact structure', () => {
    const text = 'I need you to analyze the code and find bugs. Also ensure you check edge cases.';
    const result = compressStructural(text);
    expect(result.applied).toBe(true);
    expect(result.tokensSaved).toBeGreaterThanOrEqual(0);
  });

  test('preserves task, focus, constraints', () => {
    const text = 'Task: find bugs. Focus: edge cases. Constraint: do not modify the code.';
    const result = compressStructural(text);
    expect(result.optimized).toContain('TASK:');
    expect(result.optimized).toContain('FOCUS:');
    expect(result.optimized).toContain('CONSTRAINT:');
  });

  test('returns HIGH confidence', () => {
    const result = compressStructural('Please analyze this.');
    expect(result.confidence).toBe('HIGH');
  });

  test('handles empty input', () => {
    const result = compressStructural('');
    expect(result.applied).toBe(false);
  });

  test('does not change trivial text', () => {
    const text = 'hello';
    const result = compressStructural(text);
    expect(result.optimized).toBe(text);
    expect(result.applied).toBe(false);
  });
});
