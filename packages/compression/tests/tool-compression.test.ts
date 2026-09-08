import { compressToolOutput } from '../src/tool-compression';

describe('compressToolOutput', () => {
  test('compresses git diff output', () => {
    const input = 'diff --git a/file.txt b/file.txt\n--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-old\n+new';
    const result = compressToolOutput(input);
    expect(result.applied).toBe(true);
    expect(result.toolType).toBe('git_diff');
  });

  test('compresses JSON output', () => {
    const input = JSON.stringify({ key: 'value', arr: [1, 2, 3] });
    const result = compressToolOutput(input);
    expect(result.toolType).toBe('json');
  });

  test('compresses logs keeping errors', () => {
    const input = 'info: starting\ninfo: processing\nerror: failed\ninfo: done';
    const result = compressToolOutput(input);
    expect(result.applied).toBe(true);
    expect(result.optimized).toContain('error: failed');
  });

  test('compresses terminal output keeping commands and errors', () => {
    const input = '$ ls\nfile1\n$ cat file1\n> content\n$ exit 1\nexit code 1';
    const result = compressToolOutput(input);
    expect(result.toolType).toBe('terminal');
  });

  test('compresses stack traces keeping frames', () => {
    const input = 'Error: boom\n    at fn (file.js:10)\n    at main (file.js:20)';
    const result = compressToolOutput(input);
    expect(result.toolType).toBe('stack_trace');
  });

  test('compresses search results truncating', () => {
    const input = Array.from({ length: 50 }, (_, i) => `${i + 1}. result`).join('\n');
    const result = compressToolOutput(input);
    expect(result.applied).toBe(true);
    expect(result.toolType).toBe('search_results');
  });

  test('compresses web content removing scripts and styles', () => {
    const input = '<html><body><script>bad</script><p>hello</p></body></html>';
    const result = compressToolOutput(input);
    expect(result.applied).toBe(true);
    expect(result.toolType).toBe('web_content');
  });

  test('returns tokens saved', () => {
    const input = 'diff --git a.txt b.txt\n--- a.txt\n+++ b.txt\n@@ -1 +1 @@\n-a\n+b';
    const result = compressToolOutput(input);
    expect(result.tokensSaved).toBeGreaterThanOrEqual(0);
  });
});
