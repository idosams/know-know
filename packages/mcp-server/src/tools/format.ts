import type { EntityRow, DependencyRow, LinkRow, GraphStats } from '../db.js';

export function formatEntity(entity: EntityRow): string {
  const lines: string[] = [
    `## ${entity.name} (${entity.entity_type})`,
    `**File:** ${entity.file_path}:${entity.line}`,
    `**Description:** ${entity.description}`,
  ];

  if (entity.owner) lines.push(`**Owner:** ${entity.owner}`);
  if (entity.status) lines.push(`**Status:** ${entity.status}`);
  if (entity.language) lines.push(`**Language:** ${entity.language}`);
  if (entity.signature) lines.push(`**Signature:** \`${entity.signature}\``);
  if (entity.tags) lines.push(`**Tags:** ${entity.tags}`);
  if (entity.business_goal) lines.push(`**Business Goal:** ${entity.business_goal}`);
  if (entity.funnel_stage) lines.push(`**Funnel Stage:** ${entity.funnel_stage}`);
  if (entity.revenue_impact) lines.push(`**Revenue Impact:** ${entity.revenue_impact}`);

  return lines.join('\n');
}

export function formatEntityList(entities: readonly EntityRow[]): string {
  if (entities.length === 0) {
    return 'No entities found.';
  }
  return entities.map(formatEntity).join('\n\n---\n\n');
}

export function formatDependencies(
  entityId: string,
  deps: readonly DependencyRow[]
): string {
  if (deps.length === 0) {
    return `No dependencies found for entity: ${entityId}`;
  }

  const outgoing = deps.filter((d) => d.source_id === entityId);
  const incoming = deps.filter((d) => d.target_id === entityId);

  const lines: string[] = [`## Dependencies for ${entityId}`];

  if (outgoing.length > 0) {
    lines.push('\n### Depends On');
    for (const dep of outgoing) {
      lines.push(`- ${dep.target_id} (${dep.dependency_type})`);
    }
  }

  if (incoming.length > 0) {
    lines.push('\n### Depended On By');
    for (const dep of incoming) {
      lines.push(`- ${dep.source_id} (${dep.dependency_type})`);
    }
  }

  return lines.join('\n');
}

export function formatLinks(links: readonly LinkRow[]): string {
  if (links.length === 0) {
    return 'No external links found.';
  }

  return links
    .map((link) => {
      const title = link.title ?? link.url;
      const type = link.type ? ` [${link.type}]` : '';
      return `- ${title}${type}: ${link.url} (entity: ${link.entity_id})`;
    })
    .join('\n');
}

export function formatStats(stats: GraphStats): string {
  const lines: string[] = [
    '## CodeGraph Overview',
    '',
    `**Total Entities:** ${stats.totalEntities}`,
    `**Total Links:** ${stats.totalLinks}`,
    `**Total Dependencies:** ${stats.totalDependencies}`,
  ];

  if (stats.entityTypes.length > 0) {
    lines.push('\n### Entity Types');
    for (const et of stats.entityTypes) {
      lines.push(`- ${et.type}: ${et.count}`);
    }
  }

  if (stats.owners.length > 0) {
    lines.push(`\n### Owners\n${stats.owners.join(', ')}`);
  }

  if (stats.languages.length > 0) {
    lines.push(`\n### Languages\n${stats.languages.join(', ')}`);
  }

  return lines.join('\n');
}
