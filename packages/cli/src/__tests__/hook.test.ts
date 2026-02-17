/**
 * @knowgraph
 * type: test
 * description: Tests for the hook CLI command that manages git pre-commit hooks
 * owner: knowgraph-cli
 * status: stable
 * tags: [test, cli, hook, pre-commit]
 * context:
 *   business_goal: Ensure pre-commit hook management works correctly
 *   domain: cli
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as childProcess from 'node:child_process';
import {
  HOOK_MARKER_START,
  HOOK_MARKER_END,
  buildHookScript,
  getHookPath,
  installHook,
  uninstallHook,
  getHookStatus,
} from '../commands/hook.js';

vi.mock('node:fs');
vi.mock('node:child_process');

const mockedFs = vi.mocked(fs);
const mockedChildProcess = vi.mocked(childProcess);

describe('hook command', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getHookPath', () => {
    it('returns the path to the pre-commit hook', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      const result = getHookPath();
      expect(result).toBe(path.join('/my/repo', '.git', 'hooks', 'pre-commit'));
    });

    it('returns null when not in a git repository', () => {
      mockedChildProcess.execSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });
      const result = getHookPath();
      expect(result).toBeNull();
    });
  });

  describe('buildHookScript', () => {
    it('contains the shebang line', () => {
      const script = buildHookScript();
      expect(script).toMatch(/^#!\/bin\/sh/);
    });

    it('contains the start and end markers', () => {
      const script = buildHookScript();
      expect(script).toContain(HOOK_MARKER_START);
      expect(script).toContain(HOOK_MARKER_END);
    });

    it('contains the knowgraph parse --validate command', () => {
      const script = buildHookScript();
      expect(script).toContain('npx knowgraph parse');
      expect(script).toContain('--validate');
    });

    it('filters staged files by supported extensions', () => {
      const script = buildHookScript();
      expect(script).toContain('ts|tsx|js|jsx|py');
    });
  });

  describe('installHook', () => {
    it('creates the hooks directory if it does not exist', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      mockedFs.chmodSync.mockReturnValue(undefined);

      const result = installHook();

      expect(result.success).toBe(true);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        path.join('/my/repo', '.git', 'hooks'),
        { recursive: true },
      );
    });

    it('creates hook file with correct content', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      mockedFs.chmodSync.mockReturnValue(undefined);

      installHook();

      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      expect(writeCall[0]).toBe(
        path.join('/my/repo', '.git', 'hooks', 'pre-commit'),
      );
      const content = writeCall[1] as string;
      expect(content).toContain(HOOK_MARKER_START);
      expect(content).toContain('npx knowgraph parse');
    });

    it('makes the hook file executable', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      mockedFs.chmodSync.mockReturnValue(undefined);

      installHook();

      expect(mockedFs.chmodSync).toHaveBeenCalledWith(
        path.join('/my/repo', '.git', 'hooks', 'pre-commit'),
        0o755,
      );
    });

    it('appends to existing hook that does not contain knowgraph', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      const hookPath = path.join('/my/repo', '.git', 'hooks', 'pre-commit');
      mockedFs.existsSync.mockImplementation((p) => p === hookPath);
      mockedFs.readFileSync.mockReturnValue('#!/bin/sh\necho "other hook"\n');
      mockedFs.writeFileSync.mockReturnValue(undefined);
      mockedFs.chmodSync.mockReturnValue(undefined);
      mockedFs.mkdirSync.mockReturnValue(undefined);

      const result = installHook({ force: false });

      expect(result.success).toBe(true);
      expect(result.appended).toBe(true);
      const written = mockedFs.writeFileSync.mock.calls[0][1] as string;
      expect(written).toContain('echo "other hook"');
      expect(written).toContain(HOOK_MARKER_START);
    });

    it('replaces knowgraph section in existing hook when force is true', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      const hookPath = path.join('/my/repo', '.git', 'hooks', 'pre-commit');
      const existingContent = `#!/bin/sh\necho "before"\n${HOOK_MARKER_START}\nold knowgraph stuff\n${HOOK_MARKER_END}\necho "after"\n`;
      mockedFs.existsSync.mockImplementation((p) => p === hookPath);
      mockedFs.readFileSync.mockReturnValue(existingContent);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      mockedFs.chmodSync.mockReturnValue(undefined);
      mockedFs.mkdirSync.mockReturnValue(undefined);

      const result = installHook({ force: true });

      expect(result.success).toBe(true);
      const written = mockedFs.writeFileSync.mock.calls[0][1] as string;
      expect(written).toContain('echo "before"');
      expect(written).toContain('echo "after"');
      expect(written).toContain(HOOK_MARKER_START);
      expect(written).not.toContain('old knowgraph stuff');
    });

    it('returns existing error when hook already has knowgraph and force is false', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      const hookPath = path.join('/my/repo', '.git', 'hooks', 'pre-commit');
      const existingContent = `#!/bin/sh\n${HOOK_MARKER_START}\nstuff\n${HOOK_MARKER_END}\n`;
      mockedFs.existsSync.mockImplementation((p) => p === hookPath);
      mockedFs.readFileSync.mockReturnValue(existingContent);
      mockedFs.mkdirSync.mockReturnValue(undefined);

      const result = installHook({ force: false });

      expect(result.success).toBe(false);
      expect(result.alreadyInstalled).toBe(true);
    });

    it('returns error when not in a git repository', () => {
      mockedChildProcess.execSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });

      const result = installHook();

      expect(result.success).toBe(false);
      expect(result.error).toContain('git repository');
    });
  });

  describe('uninstallHook', () => {
    it('removes the hook file when it contains only knowgraph content', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      const hookPath = path.join('/my/repo', '.git', 'hooks', 'pre-commit');
      const content = `#!/bin/sh\n${HOOK_MARKER_START}\nknowgraph stuff\n${HOOK_MARKER_END}\n`;
      mockedFs.existsSync.mockImplementation((p) => p === hookPath);
      mockedFs.readFileSync.mockReturnValue(content);
      mockedFs.unlinkSync.mockReturnValue(undefined);

      const result = uninstallHook();

      expect(result.success).toBe(true);
      expect(result.removed).toBe(true);
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(hookPath);
    });

    it('removes only the knowgraph section when other content exists', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      const hookPath = path.join('/my/repo', '.git', 'hooks', 'pre-commit');
      const content = `#!/bin/sh\necho "keep"\n${HOOK_MARKER_START}\nknowgraph stuff\n${HOOK_MARKER_END}\necho "also keep"\n`;
      mockedFs.existsSync.mockImplementation((p) => p === hookPath);
      mockedFs.readFileSync.mockReturnValue(content);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      const result = uninstallHook();

      expect(result.success).toBe(true);
      expect(result.removed).toBe(false);
      const written = mockedFs.writeFileSync.mock.calls[0][1] as string;
      expect(written).toContain('echo "keep"');
      expect(written).toContain('echo "also keep"');
      expect(written).not.toContain(HOOK_MARKER_START);
    });

    it('returns error when hook file does not exist', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      mockedFs.existsSync.mockReturnValue(false);

      const result = uninstallHook();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not installed');
    });

    it('returns error when hook does not contain knowgraph section', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      const hookPath = path.join('/my/repo', '.git', 'hooks', 'pre-commit');
      mockedFs.existsSync.mockImplementation((p) => p === hookPath);
      mockedFs.readFileSync.mockReturnValue('#!/bin/sh\necho "other"\n');

      const result = uninstallHook();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not installed');
    });

    it('returns error when not in a git repository', () => {
      mockedChildProcess.execSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });

      const result = uninstallHook();

      expect(result.success).toBe(false);
      expect(result.error).toContain('git repository');
    });
  });

  describe('getHookStatus', () => {
    it('reports installed when hook contains knowgraph markers', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      const hookPath = path.join('/my/repo', '.git', 'hooks', 'pre-commit');
      mockedFs.existsSync.mockImplementation((p) => p === hookPath);
      mockedFs.readFileSync.mockReturnValue(
        `#!/bin/sh\n${HOOK_MARKER_START}\nstuff\n${HOOK_MARKER_END}\n`,
      );

      const result = getHookStatus();

      expect(result.installed).toBe(true);
      expect(result.hookPath).toBe(hookPath);
    });

    it('reports not installed when hook file does not exist', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      mockedFs.existsSync.mockReturnValue(false);

      const result = getHookStatus();

      expect(result.installed).toBe(false);
    });

    it('reports not installed when hook does not contain knowgraph markers', () => {
      mockedChildProcess.execSync.mockReturnValue('/my/repo\n');
      const hookPath = path.join('/my/repo', '.git', 'hooks', 'pre-commit');
      mockedFs.existsSync.mockImplementation((p) => p === hookPath);
      mockedFs.readFileSync.mockReturnValue('#!/bin/sh\necho "other"\n');

      const result = getHookStatus();

      expect(result.installed).toBe(false);
    });

    it('reports not in git repo when git root detection fails', () => {
      mockedChildProcess.execSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });

      const result = getHookStatus();

      expect(result.installed).toBe(false);
      expect(result.error).toContain('git repository');
    });
  });
});
