import { describe, it, expect } from 'vitest';
import { createDefaultRegistry } from '../registry.js';
import type { Parser } from '../types.js';

describe('ParserRegistry', () => {
  const registry = createDefaultRegistry();

  describe('auto-detection', () => {
    it('auto-detects Python files', () => {
      const parser = registry.getParser('app.py');
      expect(parser?.name).toBe('python');
    });

    it('auto-detects Python stub files', () => {
      const parser = registry.getParser('types.pyi');
      expect(parser?.name).toBe('python');
    });

    it('auto-detects TypeScript files', () => {
      const parser = registry.getParser('controller.ts');
      expect(parser?.name).toBe('typescript');
    });

    it('auto-detects TSX files', () => {
      const parser = registry.getParser('component.tsx');
      expect(parser?.name).toBe('typescript');
    });

    it('auto-detects JavaScript files', () => {
      const parser = registry.getParser('utils.js');
      expect(parser?.name).toBe('typescript');
    });

    it('auto-detects JSX files', () => {
      const parser = registry.getParser('component.jsx');
      expect(parser?.name).toBe('typescript');
    });

    it('falls back to generic parser for unknown extensions', () => {
      const parser = registry.getParser('config.rb');
      expect(parser?.name).toBe('generic');
    });

    it('auto-detects Go files', () => {
      const parser = registry.getParser('main.go');
      expect(parser?.name).toBe('go');
    });

    it('auto-detects Java files', () => {
      const parser = registry.getParser('App.java');
      expect(parser?.name).toBe('java');
    });

    it('falls back to generic parser for Rust files', () => {
      const parser = registry.getParser('lib.rs');
      expect(parser?.name).toBe('generic');
    });
  });

  describe('parseFile', () => {
    it('parses Python files through registry', () => {
      const content = `"""
@knowgraph
type: module
description: Test module
"""
`;
      const results = registry.parseFile(content, 'test.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.entityType).toBe('module');
    });

    it('parses TypeScript files through registry', () => {
      const content = `
/**
 * @knowgraph
 * type: function
 * description: Test function
 */
export function testFn(): void {}
`;
      const results = registry.parseFile(content, 'test.ts');
      expect(results).toHaveLength(1);
      expect(results[0]?.entityType).toBe('function');
    });

    it('parses Go files through registry', () => {
      const content = `// @knowgraph
// type: module
// description: A Go module
package main
`;
      const results = registry.parseFile(content, 'main.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.entityType).toBe('module');
    });

    it('parses Java files through registry', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: A Java class
 */
public class App {}
`;
      const results = registry.parseFile(content, 'App.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.entityType).toBe('class');
    });

    it('returns empty array for files without knowgraph annotations', () => {
      const content = 'const x = 1;';
      const results = registry.parseFile(content, 'plain.ts');
      expect(results).toHaveLength(0);
    });
  });

  describe('register', () => {
    it('allows registering custom parsers', () => {
      const customRegistry = createDefaultRegistry();
      const customParser: Parser = {
        name: 'custom-ruby',
        supportedExtensions: ['.rb'],
        parse: () => [],
      };
      customRegistry.register(customParser);
      const parser = customRegistry.getParser('test.rb');
      expect(parser?.name).toBe('custom-ruby');
    });
  });
});
