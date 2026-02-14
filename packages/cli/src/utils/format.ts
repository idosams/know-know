import type { StoredEntity } from '@codegraph/core';

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen - 3)}...`;
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + ' '.repeat(len - str.length);
}

export function formatTable(entities: readonly StoredEntity[]): string {
  if (entities.length === 0) {
    return 'No results found.';
  }

  const headers = ['Name', 'Type', 'Owner', 'File', 'Description'];
  const rows = entities.map((e) => [
    truncate(e.name, 30),
    e.entityType,
    e.owner ?? '-',
    truncate(e.filePath, 40),
    truncate(e.description, 50),
  ]);

  const colWidths = headers.map((h, i) => {
    const maxData = rows.reduce((max, row) => Math.max(max, row[i].length), 0);
    return Math.max(h.length, maxData);
  });

  const headerLine = headers.map((h, i) => padRight(h, colWidths[i])).join('  ');
  const separator = colWidths.map((w) => '-'.repeat(w)).join('  ');
  const dataLines = rows.map((row) =>
    row.map((cell, i) => padRight(cell, colWidths[i])).join('  '),
  );

  return [headerLine, separator, ...dataLines].join('\n');
}

export function formatJson(data: unknown, pretty: boolean): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}
