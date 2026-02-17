import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';

const FIXTURES_DIR = resolve(
  __dirname,
  '../../../core/src/coverage/__tests__/fixtures/mixed-project',
);

describe('coverage command logic', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalExitCode: number | undefined;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it('should calculate coverage for the fixtures directory', async () => {
    const { calculateCoverage } = await import('@knowgraph/core');
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });

    expect(result.totalFiles).toBe(5);
    expect(result.annotatedFiles).toBe(3);
    expect(result.percentage).toBe(60);
  });

  it('should produce JSON output', async () => {
    const { calculateCoverage } = await import('@knowgraph/core');
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });
    const json = JSON.stringify(result, null, 2);
    const parsed = JSON.parse(json);

    expect(parsed.totalFiles).toBe(5);
    expect(parsed.annotatedFiles).toBe(3);
    expect(parsed.percentage).toBe(60);
    expect(parsed.byLanguage).toBeDefined();
    expect(parsed.byDirectory).toBeDefined();
    expect(parsed.byOwner).toBeDefined();
    expect(parsed.files).toHaveLength(5);
  });

  it('should detect when coverage is below threshold', async () => {
    const { calculateCoverage } = await import('@knowgraph/core');
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });

    // Coverage is 60%, threshold is 80%
    expect(result.percentage).toBeLessThan(80);
  });

  it('should pass when coverage meets threshold', async () => {
    const { calculateCoverage } = await import('@knowgraph/core');
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });

    // Coverage is 60%, threshold is 50%
    expect(result.percentage).toBeGreaterThanOrEqual(50);
  });

  it('should include language breakdown in results', async () => {
    const { calculateCoverage } = await import('@knowgraph/core');
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });

    const pythonBreakdown = result.byLanguage.find(
      (b) => b.category === 'python',
    );
    expect(pythonBreakdown).toBeDefined();
    expect(pythonBreakdown!.totalCount).toBe(2);
    expect(pythonBreakdown!.annotatedCount).toBe(1);

    const tsBreakdown = result.byLanguage.find(
      (b) => b.category === 'typescript',
    );
    expect(tsBreakdown).toBeDefined();
    expect(tsBreakdown!.totalCount).toBe(2);
    expect(tsBreakdown!.annotatedCount).toBe(1);
  });

  it('should handle nonexistent paths gracefully', async () => {
    const { calculateCoverage } = await import('@knowgraph/core');
    const result = calculateCoverage({
      rootDir: '/nonexistent/path/that/does/not/exist',
    });

    expect(result.totalFiles).toBe(0);
    expect(result.percentage).toBe(0);
  });
});
