import { describe, it, expect } from 'vitest';
import { ManifestSchema } from '../manifest.js';

describe('ManifestSchema', () => {
  it('accepts a minimal manifest with only version', () => {
    const result = ManifestSchema.parse({ version: '1.0' });
    expect(result.version).toBe('1.0');
    expect(result.include).toEqual(['**/*']);
    expect(result.exclude).toEqual(['node_modules', '.git', 'dist', 'build']);
  });

  it('accepts a fully populated manifest', () => {
    const manifest = {
      version: '1.0' as const,
      name: 'my-project',
      description: 'A sample project',
      languages: ['typescript', 'python'],
      include: ['src/**/*', 'lib/**/*'],
      exclude: ['node_modules', '.git', 'dist', 'build', 'coverage'],
      parsers: {
        typescript: {
          enabled: true,
          extensions: ['.ts', '.tsx'],
          annotation_style: 'jsdoc' as const,
        },
        python: {
          enabled: true,
          extensions: ['.py'],
          annotation_style: 'docstring' as const,
        },
      },
      connectors: {
        notion: {
          enabled: true,
          api_key_env: 'NOTION_API_KEY',
          workspace: 'my-workspace',
        },
        jira: {
          enabled: false,
        },
        webhook: {
          enabled: true,
          url: 'https://hooks.example.com/codegraph',
          events: ['entity.created' as const, 'index.complete' as const],
        },
      },
      index: {
        output_dir: '.codegraph',
        incremental: true,
      },
    };
    const result = ManifestSchema.parse(manifest);
    expect(result.name).toBe('my-project');
    expect(result.languages).toEqual(['typescript', 'python']);
    expect(result.parsers?.typescript?.annotation_style).toBe('jsdoc');
    expect(result.connectors?.notion?.enabled).toBe(true);
    expect(result.connectors?.webhook?.events).toHaveLength(2);
    expect(result.index?.output_dir).toBe('.codegraph');
  });

  it('rejects invalid version', () => {
    expect(() => ManifestSchema.parse({ version: '2.0' })).toThrow();
  });

  it('rejects missing version', () => {
    expect(() => ManifestSchema.parse({ name: 'my-project' })).toThrow();
  });

  it('rejects invalid annotation style', () => {
    expect(() =>
      ManifestSchema.parse({
        version: '1.0',
        parsers: {
          python: { annotation_style: 'yaml_frontmatter' },
        },
      }),
    ).toThrow();
  });

  it('rejects invalid webhook event', () => {
    expect(() =>
      ManifestSchema.parse({
        version: '1.0',
        connectors: {
          webhook: {
            enabled: true,
            url: 'https://hooks.example.com',
            events: ['unknown.event'],
          },
        },
      }),
    ).toThrow();
  });

  it('rejects invalid webhook url', () => {
    expect(() =>
      ManifestSchema.parse({
        version: '1.0',
        connectors: {
          webhook: {
            enabled: true,
            url: 'not-a-url',
          },
        },
      }),
    ).toThrow();
  });

  it('applies default values for include and exclude', () => {
    const result = ManifestSchema.parse({ version: '1.0' });
    expect(result.include).toEqual(['**/*']);
    expect(result.exclude).toEqual(['node_modules', '.git', 'dist', 'build']);
  });

  it('applies default values for index config', () => {
    const result = ManifestSchema.parse({
      version: '1.0',
      index: {},
    });
    expect(result.index?.output_dir).toBe('.codegraph');
    expect(result.index?.incremental).toBe(true);
  });
});
