import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { createSuggestionEngine } from '../suggestion-engine.js';
import { createDefaultRegistry } from '../../parsers/registry.js';

const FIXTURES_DIR = join(__dirname, 'fixtures', 'mixed-project');

describe('SuggestionEngine', () => {
  const registry = createDefaultRegistry();
  const engine = createSuggestionEngine(registry);

  describe('suggest', () => {
    it('returns suggestions sorted by score descending', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      expect(result.suggestions.length).toBeGreaterThan(0);

      for (let i = 1; i < result.suggestions.length; i++) {
        expect(result.suggestions[i - 1]!.score).toBeGreaterThanOrEqual(
          result.suggestions[i]!.score,
        );
      }
    });

    it('excludes already annotated files', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      const filePaths = result.suggestions.map((s) => s.filePath);
      expect(filePaths).not.toContain('annotated.ts');
      expect(filePaths).not.toContain('annotated.py');
    });

    it('excludes test files', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      const filePaths = result.suggestions.map((s) => s.filePath);
      const hasTestFiles = filePaths.some(
        (p) => p.includes('.test.') || p.includes('.spec.'),
      );
      expect(hasTestFiles).toBe(false);
    });

    it('excludes config files', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      const filePaths = result.suggestions.map((s) => s.filePath);
      expect(filePaths).not.toContain('eslint.config.js');
    });

    it('scores entry points higher', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      const indexFile = result.suggestions.find(
        (s) => s.filePath === 'index.ts',
      );
      const smallUtil = result.suggestions.find(
        (s) => s.filePath === 'small-util.ts',
      );

      expect(indexFile).toBeDefined();
      expect(smallUtil).toBeDefined();
      expect(indexFile!.score).toBeGreaterThan(smallUtil!.score);
    });

    it('includes entry-point reason for entry point files', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      const indexFile = result.suggestions.find(
        (s) => s.filePath === 'index.ts',
      );
      expect(indexFile).toBeDefined();
      expect(indexFile!.reasons).toContain('entry-point');
    });

    it('includes many-imports reason for files with many imports', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      const largeFile = result.suggestions.find(
        (s) => s.filePath === 'large-file.ts',
      );
      expect(largeFile).toBeDefined();
      expect(largeFile!.reasons).toContain('many-imports');
    });

    it('respects the limit option', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR, limit: 2 });

      expect(result.suggestions.length).toBeLessThanOrEqual(2);
    });

    it('defaults limit to 10', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      expect(result.suggestions.length).toBeLessThanOrEqual(10);
    });

    it('reports totalFiles and totalUnannotated counts', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      expect(result.totalFiles).toBeGreaterThan(0);
      expect(result.totalUnannotated).toBeGreaterThan(0);
      expect(result.totalUnannotated).toBeLessThanOrEqual(result.totalFiles);
    });

    it('includes correct language for TypeScript files', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      const tsFile = result.suggestions.find((s) =>
        s.filePath.endsWith('.ts'),
      );
      expect(tsFile).toBeDefined();
      expect(tsFile!.language).toBe('typescript');
    });

    it('includes correct language for Python files', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      const pyFile = result.suggestions.find((s) =>
        s.filePath.endsWith('.py'),
      );
      expect(pyFile).toBeDefined();
      expect(pyFile!.language).toBe('python');
    });

    it('includes lineCount in suggestions', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      for (const suggestion of result.suggestions) {
        expect(suggestion.lineCount).toBeGreaterThan(0);
      }
    });

    it('returns empty suggestions for nonexistent directory', () => {
      const result = engine.suggest({
        rootDir: join(FIXTURES_DIR, 'nonexistent'),
      });

      expect(result.suggestions).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
      expect(result.totalUnannotated).toBe(0);
    });

    it('ranks Python entry point main.py with entry-point reason', () => {
      const result = engine.suggest({ rootDir: FIXTURES_DIR });

      const mainPy = result.suggestions.find(
        (s) => s.filePath === 'main.py',
      );
      expect(mainPy).toBeDefined();
      expect(mainPy!.reasons).toContain('entry-point');
    });
  });
});
