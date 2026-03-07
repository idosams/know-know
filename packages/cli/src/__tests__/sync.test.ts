import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';

describe('registerSyncCommand', () => {
  it('registers the sync command on a Commander program', async () => {
    const { registerSyncCommand } = await import('../commands/sync.js');
    const program = new Command();

    registerSyncCommand(program);

    const syncCmd = program.commands.find((c) => c.name() === 'sync');
    expect(syncCmd).toBeDefined();
    expect(syncCmd!.description()).toContain('Sync');
  });

  it('accepts --dry-run flag', async () => {
    const { registerSyncCommand } = await import('../commands/sync.js');
    const program = new Command();

    registerSyncCommand(program);

    const syncCmd = program.commands.find((c) => c.name() === 'sync');
    const options = syncCmd!.options.map((o) => o.long);
    expect(options).toContain('--dry-run');
  });

  it('accepts --owner option', async () => {
    const { registerSyncCommand } = await import('../commands/sync.js');
    const program = new Command();

    registerSyncCommand(program);

    const syncCmd = program.commands.find((c) => c.name() === 'sync');
    const options = syncCmd!.options.map((o) => o.long);
    expect(options).toContain('--owner');
  });

  it('accepts --tags option', async () => {
    const { registerSyncCommand } = await import('../commands/sync.js');
    const program = new Command();

    registerSyncCommand(program);

    const syncCmd = program.commands.find((c) => c.name() === 'sync');
    const options = syncCmd!.options.map((o) => o.long);
    expect(options).toContain('--tags');
  });

  it('accepts --verbose flag', async () => {
    const { registerSyncCommand } = await import('../commands/sync.js');
    const program = new Command();

    registerSyncCommand(program);

    const syncCmd = program.commands.find((c) => c.name() === 'sync');
    const options = syncCmd!.options.map((o) => o.long);
    expect(options).toContain('--verbose');
  });

  it('accepts --config option', async () => {
    const { registerSyncCommand } = await import('../commands/sync.js');
    const program = new Command();

    registerSyncCommand(program);

    const syncCmd = program.commands.find((c) => c.name() === 'sync');
    const options = syncCmd!.options.map((o) => o.long);
    expect(options).toContain('--config');
  });

  it('accepts variadic connector names', async () => {
    const { registerSyncCommand } = await import('../commands/sync.js');
    const program = new Command();

    registerSyncCommand(program);

    const syncCmd = program.commands.find((c) => c.name() === 'sync');
    expect(syncCmd).toBeDefined();
    // The command should accept variadic arguments (connector names)
    const args = syncCmd!.registeredArguments;
    expect(args.length).toBeGreaterThan(0);
    expect(args[0].variadic).toBe(true);
  });
});

describe('runSync integration', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalExitCode: number | undefined;

  beforeEach(() => {
    consoleLogSpy = vi
      .spyOn(console, 'log')
      .mockImplementation(() => {});
    consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it('reports error when config file does not exist', async () => {
    const { registerSyncCommand } = await import('../commands/sync.js');
    const program = new Command();
    program.exitOverride();

    registerSyncCommand(program);

    const syncCmd = program.commands.find((c) => c.name() === 'sync');
    await syncCmd!.parseAsync([
      'node',
      'knowgraph',
      '--config',
      '/nonexistent/path/.knowgraph.yml',
    ]);

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorArg = consoleErrorSpy.mock.calls[0]?.[0] ?? '';
    expect(errorArg).toContain('Config not found');
  });

  it('shows help message when no connectors configured', async () => {
    const { writeFileSync, mkdirSync, rmSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { stringify } = await import('yaml');
    const tmpDir = join(
      '/tmp',
      `knowgraph-sync-test-${Date.now()}`,
    );
    mkdirSync(tmpDir, { recursive: true });

    const configPath = join(tmpDir, '.knowgraph.yml');
    writeFileSync(
      configPath,
      stringify({ version: '1.0', include: ['**/*'] }),
    );

    try {
      const { registerSyncCommand } = await import(
        '../commands/sync.js'
      );
      const program = new Command();
      program.exitOverride();

      registerSyncCommand(program);

      const syncCmd = program.commands.find(
        (c) => c.name() === 'sync',
      );
      await syncCmd!.parseAsync([
        'node',
        'knowgraph',
        '--config',
        configPath,
      ]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const allOutput = consoleLogSpy.mock.calls
        .map((c) => c[0])
        .join('\n');
      expect(allOutput).toContain('No connectors configured');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
