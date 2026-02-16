import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { calculateCoverage } from '../coverage-calculator.js';

const FIXTURES_DIR = resolve(__dirname, 'fixtures', 'mixed-project');

describe('calculateCoverage', () => {
  it('counts total parseable files in a directory', () => {
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });
    // annotated.ts, unannotated.ts, annotated.py, unannotated.py, also-annotated.js
    expect(result.totalFiles).toBe(5);
  });

  it('counts annotated files correctly', () => {
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });
    // annotated.ts, annotated.py, also-annotated.js
    expect(result.annotatedFiles).toBe(3);
  });

  it('calculates correct coverage percentage', () => {
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });
    // 3 out of 5 = 60%
    expect(result.percentage).toBe(60);
  });

  it('returns per-file coverage information', () => {
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });
    expect(result.files).toHaveLength(5);

    const annotatedTs = result.files.find((f) =>
      f.filePath.endsWith('annotated.ts'),
    );
    expect(annotatedTs?.hasAnnotation).toBe(true);
    expect(annotatedTs?.language).toBe('typescript');

    const unannotatedTs = result.files.find((f) =>
      f.filePath.endsWith('unannotated.ts'),
    );
    expect(unannotatedTs?.hasAnnotation).toBe(false);
  });

  it('provides breakdown by language', () => {
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });
    expect(result.byLanguage.length).toBeGreaterThan(0);

    const pythonBreakdown = result.byLanguage.find(
      (b) => b.category === 'python',
    );
    expect(pythonBreakdown).toBeDefined();
    expect(pythonBreakdown!.totalCount).toBe(2);
    expect(pythonBreakdown!.annotatedCount).toBe(1);
    expect(pythonBreakdown!.percentage).toBe(50);
  });

  it('provides breakdown by directory', () => {
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });
    // All files are in root of fixtures dir
    expect(result.byDirectory.length).toBeGreaterThan(0);
    const rootDir = result.byDirectory.find((b) => b.category === '(root)');
    expect(rootDir).toBeDefined();
    expect(rootDir!.totalCount).toBe(5);
  });

  it('provides breakdown by owner', () => {
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });
    expect(result.byOwner.length).toBeGreaterThan(0);

    const teamAlpha = result.byOwner.find(
      (b) => b.category === 'team-alpha',
    );
    expect(teamAlpha).toBeDefined();
    // annotated.ts + also-annotated.js both owned by team-alpha
    expect(teamAlpha!.annotatedCount).toBe(2);
  });

  it('returns zero coverage for empty directory', () => {
    const emptyDir = resolve(__dirname, 'fixtures', 'nonexistent-dir-test');
    const result = calculateCoverage({ rootDir: emptyDir });
    expect(result.totalFiles).toBe(0);
    expect(result.annotatedFiles).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('includes entity count per file', () => {
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });
    const annotatedTs = result.files.find((f) =>
      f.filePath.endsWith('annotated.ts'),
    );
    expect(annotatedTs?.entityCount).toBeGreaterThanOrEqual(1);

    const unannotatedTs = result.files.find((f) =>
      f.filePath.endsWith('unannotated.ts'),
    );
    expect(unannotatedTs?.entityCount).toBe(0);
  });

  it('sorts breakdown by percentage descending', () => {
    const result = calculateCoverage({ rootDir: FIXTURES_DIR });
    for (let i = 1; i < result.byLanguage.length; i++) {
      expect(result.byLanguage[i - 1]!.percentage).toBeGreaterThanOrEqual(
        result.byLanguage[i]!.percentage,
      );
    }
  });
});
