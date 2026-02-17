import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { registerValidateCommand } from '../commands/validate.js';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

describe('validate command', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let originalExitCode: number | undefined;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  function createProgram(): Command {
    const program = new Command();
    program.exitOverride();
    registerValidateCommand(program);
    return program;
  }

  it('registers the validate command', () => {
    const program = createProgram();
    const cmd = program.commands.find((c) => c.name() === 'validate');
    expect(cmd).toBeDefined();
  });

  it('validates a valid fixture file', () => {
    const program = createProgram();
    const samplePath = resolve(FIXTURES_DIR, 'sample.ts');
    program.parse(['node', 'knowgraph', 'validate', samplePath]);
    expect(process.exitCode).toBeUndefined();
  });

  it('reports validation issues for fixtures directory', () => {
    const program = createProgram();
    program.parse(['node', 'knowgraph', 'validate', FIXTURES_DIR]);
    // Should produce output
    expect(logSpy).toHaveBeenCalled();
  });

  it('outputs JSON format when --format json is used', () => {
    const program = createProgram();
    const samplePath = resolve(FIXTURES_DIR, 'sample.ts');
    program.parse([
      'node',
      'knowgraph',
      'validate',
      samplePath,
      '--format',
      'json',
    ]);

    const jsonOutput = logSpy.mock.calls
      .map((c) => c[0])
      .find((s) => typeof s === 'string' && s.startsWith('{'));
    expect(jsonOutput).toBeDefined();
    const parsed = JSON.parse(jsonOutput as string);
    expect(parsed).toHaveProperty('issues');
    expect(parsed).toHaveProperty('fileCount');
    expect(parsed).toHaveProperty('errorCount');
    expect(parsed).toHaveProperty('warningCount');
    expect(parsed).toHaveProperty('isValid');
  });

  it('sets exit code 1 for invalid path', () => {
    const program = createProgram();
    program.parse([
      'node',
      'knowgraph',
      'validate',
      '/nonexistent/path/foo/bar',
    ]);
    expect(process.exitCode).toBe(1);
  });

  it('accepts --rule option to filter rules', () => {
    const program = createProgram();
    const samplePath = resolve(FIXTURES_DIR, 'sample.ts');
    program.parse([
      'node',
      'knowgraph',
      'validate',
      samplePath,
      '--rule',
      'required-fields',
    ]);
    expect(logSpy).toHaveBeenCalled();
  });

  it('defaults to current directory when no path provided', () => {
    const program = createProgram();
    // This just verifies it doesn't crash when no path is given
    program.parse(['node', 'knowgraph', 'validate']);
    expect(logSpy).toHaveBeenCalled();
  });
});
