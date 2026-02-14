import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const EXTENSION_TO_LANGUAGE: Readonly<Record<string, string>> = {
  '.py': 'python',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.c': 'c',
  '.swift': 'swift',
  '.kt': 'kotlin',
};

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '__pycache__',
  '.venv', 'venv', '.tox', 'coverage', '.next',
]);

function scanDirectory(
  dir: string,
  extCounts: Map<string, number>,
  depth: number,
): void {
  if (depth > 4) return;

  let entries: readonly string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.startsWith('.') && depth > 0) continue;
    if (SKIP_DIRS.has(entry)) continue;

    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        scanDirectory(fullPath, extCounts, depth + 1);
      } else if (stat.isFile()) {
        const ext = extname(entry);
        if (ext && EXTENSION_TO_LANGUAGE[ext]) {
          extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
        }
      }
    } catch {
      // Skip inaccessible files
    }
  }
}

export function detectLanguages(dir: string): readonly string[] {
  const extCounts = new Map<string, number>();
  scanDirectory(dir, extCounts, 0);

  const languageCounts = new Map<string, number>();
  for (const [ext, count] of extCounts) {
    const lang = EXTENSION_TO_LANGUAGE[ext];
    if (lang) {
      languageCounts.set(lang, (languageCounts.get(lang) ?? 0) + count);
    }
  }

  return [...languageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}

export function suggestFiles(dir: string): readonly string[] {
  const suggestions: Array<{ readonly path: string; readonly size: number }> = [];
  const entryPointNames = new Set([
    'index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js',
    'main.py', 'app.py', '__init__.py', 'server.ts', 'server.js',
  ]);

  let entries: readonly string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue;
    const fullPath = join(dir, entry);

    try {
      const stat = statSync(fullPath);
      if (stat.isFile()) {
        const ext = extname(entry);
        if (EXTENSION_TO_LANGUAGE[ext]) {
          const isEntryPoint = entryPointNames.has(entry);
          const priority = isEntryPoint ? stat.size + 1_000_000 : stat.size;
          suggestions.push({ path: entry, size: priority });
        }
      } else if (stat.isDirectory()) {
        const subEntries = readdirSync(fullPath);
        for (const sub of subEntries) {
          const subExt = extname(sub);
          if (EXTENSION_TO_LANGUAGE[subExt]) {
            const subPath = `${entry}/${sub}`;
            const subStat = statSync(join(fullPath, sub));
            if (subStat.isFile()) {
              const isEntryPoint = entryPointNames.has(sub);
              const priority = isEntryPoint ? subStat.size + 1_000_000 : subStat.size;
              suggestions.push({ path: subPath, size: priority });
            }
          }
        }
      }
    } catch {
      // Skip inaccessible
    }
  }

  return suggestions
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .map((s) => s.path);
}
