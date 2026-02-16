/**
 * @knowgraph
 * type: module
 * description: Extracts and validates @knowgraph YAML metadata from comment blocks
 * owner: knowgraph-core
 * status: stable
 * tags: [parser, yaml, extraction, metadata]
 * context:
 *   business_goal: Transform raw code comments into structured, validated metadata
 *   domain: parser-engine
 */
import { parse as parseYaml } from 'yaml';
import { CoreMetadataSchema, ExtendedMetadataSchema } from '../types/entity.js';
import type { CoreMetadata, ExtendedMetadata } from '../types/entity.js';

export interface ExtractionError {
  readonly message: string;
  readonly line?: number;
}

export interface ExtractionResult {
  readonly metadata: CoreMetadata | ExtendedMetadata | null;
  readonly errors: readonly ExtractionError[];
  readonly rawYaml: string;
}

/**
 * Remove common leading whitespace from all non-empty lines.
 */
function dedent(text: string): string {
  const lines = text.split('\n');
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  if (nonEmptyLines.length === 0) return text;

  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    }),
  );

  if (minIndent === 0) return text;

  return lines
    .map((line) => (line.trim().length > 0 ? line.slice(minIndent) : line))
    .join('\n');
}

/**
 * Extract the YAML content following a @knowgraph marker from a comment block.
 * Returns null if no @knowgraph marker is found.
 */
export function extractKnowgraphYaml(commentBlock: string): string | null {
  const marker = '@knowgraph';
  const markerIndex = commentBlock.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const afterMarker = commentBlock.slice(markerIndex + marker.length);

  // Strip leading asterisks/hashes from each line (JSDoc or Python comment style)
  const lines = afterMarker.split('\n').map((line) => {
    // Remove leading whitespace + * + optional space (JSDoc style)
    const jsDocStripped = line.replace(/^\s*\*\s?/, '');
    if (jsDocStripped !== line) return jsDocStripped;
    // Remove leading whitespace + # + optional space (Python/shell comment style)
    const hashStripped = line.replace(/^\s*#\s?/, '');
    if (hashStripped !== line) return hashStripped;
    return line;
  });

  // Dedent to handle indented docstrings (e.g., Python method docstrings)
  // then trim leading/trailing whitespace
  return dedent(lines.join('\n')).trim();
}

/**
 * Parse YAML string and validate against knowgraph schemas.
 * Tries ExtendedMetadataSchema first, then falls back to CoreMetadataSchema.
 */
export function parseAndValidateMetadata(
  yamlString: string,
  baseLineOffset: number = 0,
): ExtractionResult {
  if (!yamlString.trim()) {
    return {
      metadata: null,
      errors: [{ message: 'Empty YAML content', line: baseLineOffset }],
      rawYaml: yamlString,
    };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(yamlString);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid YAML';
    return {
      metadata: null,
      errors: [
        { message: `YAML parse error: ${message}`, line: baseLineOffset },
      ],
      rawYaml: yamlString,
    };
  }

  if (parsed === null || parsed === undefined || typeof parsed !== 'object') {
    return {
      metadata: null,
      errors: [
        { message: 'YAML did not produce an object', line: baseLineOffset },
      ],
      rawYaml: yamlString,
    };
  }

  // Try extended schema first (superset of core)
  const extendedResult = ExtendedMetadataSchema.safeParse(parsed);
  if (extendedResult.success) {
    return {
      metadata: extendedResult.data,
      errors: [],
      rawYaml: yamlString,
    };
  }

  // Try core schema
  const coreResult = CoreMetadataSchema.safeParse(parsed);
  if (coreResult.success) {
    return {
      metadata: coreResult.data,
      errors: [],
      rawYaml: yamlString,
    };
  }

  // Both failed; report errors from extended schema (more informative)
  const errors: readonly ExtractionError[] = extendedResult.error.issues.map(
    (issue) => ({
      message: `Validation error at ${issue.path.join('.')}: ${issue.message}`,
      line: baseLineOffset,
    }),
  );

  return {
    metadata: null,
    errors,
    rawYaml: yamlString,
  };
}

/**
 * Extract and validate @knowgraph metadata from a comment block.
 */
export function extractMetadata(
  commentBlock: string,
  baseLineOffset: number = 0,
): ExtractionResult {
  const yamlContent = extractKnowgraphYaml(commentBlock);
  if (yamlContent === null) {
    return {
      metadata: null,
      errors: [],
      rawYaml: '',
    };
  }

  return parseAndValidateMetadata(yamlContent, baseLineOffset);
}
