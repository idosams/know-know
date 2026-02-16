import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { createDefaultRegistry, createSuggestionEngine } from '@knowgraph/core';

// __dirname = packages/cli/src/__tests__
// Go up to packages/, then into core/
const FIXTURES_DIR = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'core',
  'src',
  'suggest',
  '__tests__',
  'fixtures',
  'mixed-project',
);

describe('suggest command logic', () => {
  const registry = createDefaultRegistry();
  const engine = createSuggestionEngine(registry);

  it('returns ranked suggestions for a directory', () => {
    const result = engine.suggest({ rootDir: FIXTURES_DIR });

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.totalUnannotated).toBeGreaterThan(0);
    expect(result.totalFiles).toBeGreaterThan(0);
  });

  it('produces valid JSON output', () => {
    const result = engine.suggest({ rootDir: FIXTURES_DIR });
    const json = JSON.stringify(result, null, 2);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty('suggestions');
    expect(parsed).toHaveProperty('totalUnannotated');
    expect(parsed).toHaveProperty('totalFiles');
    expect(Array.isArray(parsed.suggestions)).toBe(true);
  });

  it('respects limit option', () => {
    const result = engine.suggest({ rootDir: FIXTURES_DIR, limit: 2 });

    expect(result.suggestions.length).toBeLessThanOrEqual(2);
  });

  it('registers as a commander command', async () => {
    const { registerSuggestCommand } = await import('../commands/suggest.js');
    const { Command } = await import('commander');
    const program = new Command();

    registerSuggestCommand(program);

    const suggestCmd = program.commands.find((c) => c.name() === 'suggest');
    expect(suggestCmd).toBeDefined();
    expect(suggestCmd!.description()).toContain('impactful');
  });

  it('returns suggestions with correct structure', () => {
    const result = engine.suggest({ rootDir: FIXTURES_DIR });

    for (const suggestion of result.suggestions) {
      expect(suggestion).toHaveProperty('filePath');
      expect(suggestion).toHaveProperty('score');
      expect(suggestion).toHaveProperty('reasons');
      expect(suggestion).toHaveProperty('language');
      expect(suggestion).toHaveProperty('lineCount');
      expect(typeof suggestion.filePath).toBe('string');
      expect(typeof suggestion.score).toBe('number');
      expect(Array.isArray(suggestion.reasons)).toBe(true);
      expect(typeof suggestion.language).toBe('string');
      expect(typeof suggestion.lineCount).toBe('number');
    }
  });
});
