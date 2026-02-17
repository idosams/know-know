/**
 * @knowgraph
 * type: module
 * description: CLI command for managing git pre-commit hooks that validate @knowgraph annotations
 * owner: knowgraph-cli
 * status: stable
 * tags: [cli, command, hook, pre-commit, git]
 * context:
 *   business_goal: Automate annotation validation on every commit via git hooks
 *   domain: cli
 */
import {
  existsSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  mkdirSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import type { Command } from 'commander';
import chalk from 'chalk';

export const HOOK_MARKER_START = '# >>> KnowGraph pre-commit hook >>>';
export const HOOK_MARKER_END = '# <<< KnowGraph pre-commit hook <<<';

interface InstallOptions {
  readonly force?: boolean;
}

interface InstallResult {
  readonly success: boolean;
  readonly appended?: boolean;
  readonly alreadyInstalled?: boolean;
  readonly error?: string;
}

interface UninstallResult {
  readonly success: boolean;
  readonly removed?: boolean;
  readonly error?: string;
}

interface HookStatus {
  readonly installed: boolean;
  readonly hookPath?: string;
  readonly error?: string;
}

export function getHookPath(): string | null {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
    }).trim();
    return join(gitRoot, '.git', 'hooks', 'pre-commit');
  } catch {
    return null;
  }
}

export function buildHookScript(): string {
  return [
    '#!/bin/sh',
    HOOK_MARKER_START,
    '# Validates @knowgraph annotations in staged files',
    '',
    'STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\\.(ts|tsx|js|jsx|py)$")',
    '',
    'if [ -z "$STAGED_FILES" ]; then',
    '  exit 0',
    'fi',
    '',
    'echo "KnowGraph: Validating annotations in staged files..."',
    '',
    'echo "$STAGED_FILES" | while IFS= read -r file; do',
    '  npx knowgraph parse "$file" --validate 2>&1',
    '  if [ $? -ne 0 ]; then',
    '    echo "KnowGraph: Validation failed for $file"',
    '    exit 1',
    '  fi',
    'done',
    '',
    '# Propagate validation failure from subshell',
    'if [ $? -ne 0 ]; then',
    '  exit 1',
    'fi',
    '',
    'echo "KnowGraph: All annotations valid"',
    HOOK_MARKER_END,
    '',
  ].join('\n');
}

function getGitRoot(): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
    }).trim();
  } catch {
    return null;
  }
}

function hasKnowgraphSection(content: string): boolean {
  return (
    content.includes(HOOK_MARKER_START) && content.includes(HOOK_MARKER_END)
  );
}

function removeKnowgraphSection(content: string): string {
  const startIdx = content.indexOf(HOOK_MARKER_START);
  const endIdx = content.indexOf(HOOK_MARKER_END);
  if (startIdx === -1 || endIdx === -1) {
    return content;
  }
  const before = content.slice(0, startIdx);
  const after = content.slice(endIdx + HOOK_MARKER_END.length);
  return (before + after).replace(/\n{3,}/g, '\n\n');
}

function extractKnowgraphSection(): string {
  const full = buildHookScript();
  const startIdx = full.indexOf(HOOK_MARKER_START);
  const endIdx = full.indexOf(HOOK_MARKER_END) + HOOK_MARKER_END.length;
  return full.slice(startIdx, endIdx);
}

function isOnlyKnowgraphContent(content: string): boolean {
  const stripped = removeKnowgraphSection(content)
    .replace(/^#!\/bin\/sh\s*/, '')
    .trim();
  return stripped.length === 0;
}

export function installHook(options: InstallOptions = {}): InstallResult {
  const { force = false } = options;

  const gitRoot = getGitRoot();
  if (gitRoot === null) {
    return { success: false, error: 'Not in a git repository' };
  }

  const hooksDir = join(gitRoot, '.git', 'hooks');
  const hookPath = join(hooksDir, 'pre-commit');

  mkdirSync(hooksDir, { recursive: true });

  if (existsSync(hookPath)) {
    const existingContent = readFileSync(hookPath, 'utf-8');

    if (hasKnowgraphSection(existingContent)) {
      if (!force) {
        return { success: false, alreadyInstalled: true };
      }
      const updated = removeKnowgraphSection(existingContent);
      const newContent =
        updated.trimEnd() + '\n\n' + extractKnowgraphSection() + '\n';
      writeFileSync(hookPath, newContent);
      chmodSync(hookPath, 0o755);
      return { success: true, appended: false };
    }

    const newContent =
      existingContent.trimEnd() + '\n\n' + extractKnowgraphSection() + '\n';
    writeFileSync(hookPath, newContent);
    chmodSync(hookPath, 0o755);
    return { success: true, appended: true };
  }

  writeFileSync(hookPath, buildHookScript());
  chmodSync(hookPath, 0o755);
  return { success: true };
}

export function uninstallHook(): UninstallResult {
  const gitRoot = getGitRoot();
  if (gitRoot === null) {
    return { success: false, error: 'Not in a git repository' };
  }

  const hookPath = join(gitRoot, '.git', 'hooks', 'pre-commit');

  if (!existsSync(hookPath)) {
    return { success: false, error: 'KnowGraph hook is not installed' };
  }

  const content = readFileSync(hookPath, 'utf-8');

  if (!hasKnowgraphSection(content)) {
    return { success: false, error: 'KnowGraph hook is not installed' };
  }

  if (isOnlyKnowgraphContent(content)) {
    unlinkSync(hookPath);
    return { success: true, removed: true };
  }

  const updated = removeKnowgraphSection(content);
  writeFileSync(hookPath, updated);
  return { success: true, removed: false };
}

export function getHookStatus(): HookStatus {
  const gitRoot = getGitRoot();
  if (gitRoot === null) {
    return { installed: false, error: 'Not in a git repository' };
  }

  const hookPath = join(gitRoot, '.git', 'hooks', 'pre-commit');

  if (!existsSync(hookPath)) {
    return { installed: false, hookPath };
  }

  const content = readFileSync(hookPath, 'utf-8');

  if (hasKnowgraphSection(content)) {
    return { installed: true, hookPath };
  }

  return { installed: false, hookPath };
}

export function registerHookCommand(program: Command): void {
  const hookCmd = program
    .command('hook')
    .description('Manage KnowGraph git pre-commit hooks');

  hookCmd
    .command('install')
    .description('Install the KnowGraph pre-commit hook')
    .option('--force', 'Overwrite existing KnowGraph hook section', false)
    .action((options: { readonly force: boolean }) => {
      const result = installHook({ force: options.force });

      if (result.alreadyInstalled) {
        console.log(
          chalk.yellow(
            'KnowGraph hook is already installed. Use --force to reinstall.',
          ),
        );
        return;
      }

      if (!result.success) {
        console.error(chalk.red(`Error: ${result.error}`));
        process.exitCode = 1;
        return;
      }

      if (result.appended) {
        console.log(
          chalk.green('KnowGraph hook appended to existing pre-commit hook.'),
        );
      } else {
        console.log(chalk.green('KnowGraph pre-commit hook installed.'));
      }
    });

  hookCmd
    .command('uninstall')
    .description('Remove the KnowGraph pre-commit hook')
    .action(() => {
      const result = uninstallHook();

      if (!result.success) {
        console.error(chalk.red(`Error: ${result.error}`));
        process.exitCode = 1;
        return;
      }

      if (result.removed) {
        console.log(chalk.green('KnowGraph pre-commit hook removed.'));
      } else {
        console.log(
          chalk.green(
            'KnowGraph section removed from pre-commit hook (other hooks preserved).',
          ),
        );
      }
    });

  hookCmd
    .command('status')
    .description('Check if the KnowGraph pre-commit hook is installed')
    .action(() => {
      const status = getHookStatus();

      if (status.error) {
        console.error(chalk.red(`Error: ${status.error}`));
        process.exitCode = 1;
        return;
      }

      if (status.installed) {
        console.log(
          chalk.green(`KnowGraph hook is installed at ${status.hookPath}`),
        );
      } else {
        console.log(chalk.yellow('KnowGraph hook is not installed.'));
        console.log(chalk.dim('Run `knowgraph hook install` to install it.'));
      }
    });
}
