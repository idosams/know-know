import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { resolve, join } from 'node:path';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { detectLanguages, suggestFiles } from '../utils/detect.js';

const TEMP_DIR = resolve(__dirname, '.tmp-detect-test');

beforeEach(() => {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEMP_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
});

describe('detectLanguages', () => {
  it('should detect Python language', () => {
    writeFileSync(join(TEMP_DIR, 'main.py'), '# python file\n');
    writeFileSync(join(TEMP_DIR, 'utils.py'), '# python file\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages).toContain('python');
  });

  it('should detect TypeScript language', () => {
    writeFileSync(join(TEMP_DIR, 'index.ts'), '// ts file\n');
    writeFileSync(join(TEMP_DIR, 'app.tsx'), '// tsx file\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages).toContain('typescript');
  });

  it('should detect JavaScript language', () => {
    writeFileSync(join(TEMP_DIR, 'app.js'), '// js file\n');
    writeFileSync(join(TEMP_DIR, 'component.jsx'), '// jsx file\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages).toContain('javascript');
  });

  it('should detect Go language', () => {
    writeFileSync(join(TEMP_DIR, 'main.go'), 'package main\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages).toContain('go');
  });

  it('should detect Rust language', () => {
    writeFileSync(join(TEMP_DIR, 'main.rs'), 'fn main() {}\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages).toContain('rust');
  });

  it('should detect Java language', () => {
    writeFileSync(join(TEMP_DIR, 'Main.java'), 'public class Main {}\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages).toContain('java');
  });

  it('should detect multiple languages and sort by count', () => {
    writeFileSync(join(TEMP_DIR, 'a.py'), '#\n');
    writeFileSync(join(TEMP_DIR, 'b.py'), '#\n');
    writeFileSync(join(TEMP_DIR, 'c.py'), '#\n');
    writeFileSync(join(TEMP_DIR, 'x.ts'), '//\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages[0]).toBe('python');
    expect(languages[1]).toBe('typescript');
  });

  it('should scan nested directories', () => {
    mkdirSync(join(TEMP_DIR, 'src'), { recursive: true });
    writeFileSync(join(TEMP_DIR, 'src', 'index.ts'), '// nested\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages).toContain('typescript');
  });

  it('should skip node_modules directory', () => {
    mkdirSync(join(TEMP_DIR, 'node_modules'), { recursive: true });
    writeFileSync(join(TEMP_DIR, 'node_modules', 'pkg.js'), '// skip\n');
    writeFileSync(join(TEMP_DIR, 'index.ts'), '// keep\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages).toContain('typescript');
    expect(languages).not.toContain('javascript');
  });

  it('should return empty array for non-existent directory', () => {
    const languages = detectLanguages('/nonexistent/path');
    expect(languages).toEqual([]);
  });

  it('should return empty array for empty directory', () => {
    const languages = detectLanguages(TEMP_DIR);
    expect(languages).toEqual([]);
  });
});

describe('suggestFiles', () => {
  it('should suggest entry point files first', () => {
    writeFileSync(join(TEMP_DIR, 'index.ts'), '// entry\n');
    writeFileSync(join(TEMP_DIR, 'utils.ts'), '// utils\n');

    const suggestions = suggestFiles(TEMP_DIR);
    expect(suggestions[0]).toBe('index.ts');
  });

  it('should suggest main.ts as entry point', () => {
    writeFileSync(join(TEMP_DIR, 'main.ts'), '// main\n');
    writeFileSync(join(TEMP_DIR, 'other.ts'), '// other\n');

    const suggestions = suggestFiles(TEMP_DIR);
    expect(suggestions[0]).toBe('main.ts');
  });

  it('should suggest app.py as entry point', () => {
    writeFileSync(join(TEMP_DIR, 'app.py'), '# app\n');
    writeFileSync(join(TEMP_DIR, 'helper.py'), '# helper\n');

    const suggestions = suggestFiles(TEMP_DIR);
    expect(suggestions[0]).toBe('app.py');
  });

  it('should suggest files from subdirectories', () => {
    mkdirSync(join(TEMP_DIR, 'src'), { recursive: true });
    writeFileSync(join(TEMP_DIR, 'src', 'index.ts'), '// src index\n');

    const suggestions = suggestFiles(TEMP_DIR);
    expect(suggestions).toContain('src/index.ts');
  });

  it('should skip node_modules', () => {
    mkdirSync(join(TEMP_DIR, 'node_modules'), { recursive: true });
    writeFileSync(join(TEMP_DIR, 'node_modules', 'pkg.js'), '// skip\n');
    writeFileSync(join(TEMP_DIR, 'app.ts'), '// keep\n');

    const suggestions = suggestFiles(TEMP_DIR);
    expect(suggestions).not.toContain('node_modules/pkg.js');
    expect(suggestions).toContain('app.ts');
  });

  it('should limit to 10 suggestions', () => {
    for (let i = 0; i < 15; i++) {
      writeFileSync(join(TEMP_DIR, `file${i}.ts`), '// file\n');
    }

    const suggestions = suggestFiles(TEMP_DIR);
    expect(suggestions.length).toBeLessThanOrEqual(10);
  });

  it('should return empty array for non-existent directory', () => {
    const suggestions = suggestFiles('/nonexistent/path');
    expect(suggestions).toEqual([]);
  });

  it('should return empty array for empty directory', () => {
    const suggestions = suggestFiles(TEMP_DIR);
    expect(suggestions).toEqual([]);
  });

  it('should only suggest files with known extensions', () => {
    writeFileSync(join(TEMP_DIR, 'readme.md'), '# readme\n');
    writeFileSync(join(TEMP_DIR, 'index.ts'), '// ts\n');
    writeFileSync(join(TEMP_DIR, 'data.json'), '{}\n');

    const suggestions = suggestFiles(TEMP_DIR);
    expect(suggestions).toContain('index.ts');
    expect(suggestions).not.toContain('readme.md');
    expect(suggestions).not.toContain('data.json');
  });
});
