import { describe, it, expect } from 'vitest';
import {
  extractKnowgraphYaml,
  parseAndValidateMetadata,
  extractMetadata,
} from '../metadata-extractor.js';

describe('extractKnowgraphYaml', () => {
  it('extracts YAML after @knowgraph marker', () => {
    const block = `
@knowgraph
type: function
description: My function
    `;
    const result = extractKnowgraphYaml(block);
    expect(result).toContain('type: function');
    expect(result).toContain('description: My function');
  });

  it('returns null when no @knowgraph marker present', () => {
    const block = 'This is just a regular comment block.';
    expect(extractKnowgraphYaml(block)).toBeNull();
  });

  it('strips leading asterisks from JSDoc style', () => {
    const block = `
 * @knowgraph
 * type: class
 * description: A class
    `;
    const result = extractKnowgraphYaml(block);
    expect(result).toContain('type: class');
    expect(result).toContain('description: A class');
    expect(result).not.toContain('*');
  });

  it('strips leading hashes from Python comment style', () => {
    const block = `
# @knowgraph
# type: module
# description: A module
    `;
    const result = extractKnowgraphYaml(block);
    expect(result).toContain('type: module');
    expect(result).toContain('description: A module');
  });

  it('handles @knowgraph on same line as other content before it', () => {
    const block = 'Some preamble @knowgraph\ntype: function\ndescription: Test';
    const result = extractKnowgraphYaml(block);
    expect(result).toContain('type: function');
  });
});

describe('parseAndValidateMetadata', () => {
  it('parses valid core metadata', () => {
    const yaml = 'type: function\ndescription: Authenticates a user';
    const result = parseAndValidateMetadata(yaml);
    expect(result.metadata).not.toBeNull();
    expect(result.metadata?.type).toBe('function');
    expect(result.metadata?.description).toBe('Authenticates a user');
    expect(result.errors).toHaveLength(0);
  });

  it('parses valid extended metadata', () => {
    const yaml = `
type: service
description: Payment processing
owner: payments-team
context:
  business_goal: Revenue processing
  funnel_stage: revenue
  revenue_impact: critical
    `.trim();
    const result = parseAndValidateMetadata(yaml);
    expect(result.metadata).not.toBeNull();
    expect(result.metadata?.type).toBe('service');
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors for invalid YAML syntax', () => {
    const yaml = 'type: [invalid yaml';
    const result = parseAndValidateMetadata(yaml);
    expect(result.metadata).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('YAML parse error');
  });

  it('returns errors for empty content', () => {
    const result = parseAndValidateMetadata('   ');
    expect(result.metadata).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('Empty YAML content');
  });

  it('returns errors when required fields are missing', () => {
    const yaml = 'owner: some-team';
    const result = parseAndValidateMetadata(yaml);
    expect(result.metadata).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns errors for invalid entity type', () => {
    const yaml = 'type: widget\ndescription: A widget';
    const result = parseAndValidateMetadata(yaml);
    expect(result.metadata).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns errors for non-object YAML', () => {
    const yaml = '- item1\n- item2';
    const result = parseAndValidateMetadata(yaml);
    expect(result.metadata).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('includes line offset in errors', () => {
    const yaml = 'type: invalid\ndescription: A thing';
    const result = parseAndValidateMetadata(yaml, 10);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.line).toBe(10);
  });

  it('validates optional fields correctly', () => {
    const yaml = `
type: function
description: A function
owner: team-a
status: stable
tags: [auth, security]
    `.trim();
    const result = parseAndValidateMetadata(yaml);
    expect(result.metadata).not.toBeNull();
    expect(result.metadata?.owner).toBe('team-a');
    expect(result.metadata?.status).toBe('stable');
    expect(result.metadata?.tags).toEqual(['auth', 'security']);
    expect(result.errors).toHaveLength(0);
  });
});

describe('extractMetadata', () => {
  it('extracts and validates metadata from a comment block', () => {
    const block = `
@knowgraph
type: function
description: Authenticates a user
owner: auth-team
    `;
    const result = extractMetadata(block);
    expect(result.metadata).not.toBeNull();
    expect(result.metadata?.type).toBe('function');
    expect(result.metadata?.owner).toBe('auth-team');
    expect(result.errors).toHaveLength(0);
  });

  it('returns empty result when no @knowgraph marker', () => {
    const block = 'Just a regular comment.';
    const result = extractMetadata(block);
    expect(result.metadata).toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.rawYaml).toBe('');
  });

  it('returns errors for invalid metadata', () => {
    const block = `
@knowgraph
type: invalid_type
description: Something
    `;
    const result = extractMetadata(block);
    expect(result.metadata).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
