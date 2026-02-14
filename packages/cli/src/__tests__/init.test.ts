import { describe, it, expect, afterEach } from 'vitest';
import { resolve, join } from 'node:path';
import {
  mkdirSync,
  rmSync,
  existsSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import { parse, stringify } from 'yaml';
import { detectLanguages } from '../utils/detect.js';

const TEMP_DIR = resolve(__dirname, '.tmp-init-test');

afterEach(() => {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
});

describe('init command logic', () => {
  it('should detect Python language from file extensions', () => {
    mkdirSync(TEMP_DIR, { recursive: true });
    writeFileSync(join(TEMP_DIR, 'main.py'), '# python file\n');
    writeFileSync(join(TEMP_DIR, 'utils.py'), '# python file\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages).toContain('python');
  });

  it('should detect TypeScript language from file extensions', () => {
    mkdirSync(TEMP_DIR, { recursive: true });
    writeFileSync(join(TEMP_DIR, 'index.ts'), '// ts file\n');
    writeFileSync(join(TEMP_DIR, 'app.tsx'), '// tsx file\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages).toContain('typescript');
  });

  it('should detect multiple languages', () => {
    mkdirSync(TEMP_DIR, { recursive: true });
    writeFileSync(join(TEMP_DIR, 'main.py'), '# python\n');
    writeFileSync(join(TEMP_DIR, 'index.ts'), '// typescript\n');
    writeFileSync(join(TEMP_DIR, 'app.js'), '// javascript\n');

    const languages = detectLanguages(TEMP_DIR);
    expect(languages.length).toBeGreaterThanOrEqual(2);
  });

  it('should generate valid .codegraph.yml content', () => {
    const manifest = {
      version: '1.0',
      name: 'test-project',
      languages: ['python', 'typescript'],
      include: ['**/*'],
      exclude: ['node_modules', '.git', 'dist', 'build', '__pycache__'],
      index: {
        output_dir: '.codegraph',
        incremental: true,
      },
    };

    mkdirSync(TEMP_DIR, { recursive: true });
    const yamlContent = stringify(manifest);
    const configPath = join(TEMP_DIR, '.codegraph.yml');
    writeFileSync(configPath, yamlContent, 'utf-8');

    const content = readFileSync(configPath, 'utf-8');
    const parsed = parse(content);
    expect(parsed.version).toBe('1.0');
    expect(parsed.name).toBe('test-project');
    expect(parsed.languages).toContain('python');
    expect(parsed.languages).toContain('typescript');
  });
});
