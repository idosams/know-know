import { describe, it, expect } from 'vitest';
import {
  CoreMetadataSchema,
  ExtendedMetadataSchema,
  EntityTypeSchema,
  StatusSchema,
  LinkSchema,
  FunnelStageSchema,
  RevenueImpactSchema,
  DataSensitivitySchema,
} from '../entity.js';

describe('EntityTypeSchema', () => {
  it('accepts all valid entity types', () => {
    const validTypes = [
      'module', 'class', 'function', 'method', 'service',
      'api_endpoint', 'variable', 'constant', 'interface', 'enum',
    ];
    for (const type of validTypes) {
      expect(EntityTypeSchema.parse(type)).toBe(type);
    }
  });

  it('rejects invalid entity types', () => {
    expect(() => EntityTypeSchema.parse('widget')).toThrow();
    expect(() => EntityTypeSchema.parse('')).toThrow();
    expect(() => EntityTypeSchema.parse(123)).toThrow();
  });
});

describe('StatusSchema', () => {
  it('accepts valid statuses', () => {
    expect(StatusSchema.parse('experimental')).toBe('experimental');
    expect(StatusSchema.parse('stable')).toBe('stable');
    expect(StatusSchema.parse('deprecated')).toBe('deprecated');
  });

  it('rejects invalid statuses', () => {
    expect(() => StatusSchema.parse('beta')).toThrow();
    expect(() => StatusSchema.parse('active')).toThrow();
  });
});

describe('LinkSchema', () => {
  it('accepts a valid link with all fields', () => {
    const link = {
      type: 'notion' as const,
      url: 'https://notion.so/my-doc',
      title: 'Design Document',
    };
    expect(LinkSchema.parse(link)).toEqual(link);
  });

  it('accepts a link with only url', () => {
    const link = { url: 'https://example.com' };
    expect(LinkSchema.parse(link)).toEqual(link);
  });

  it('rejects a link without url', () => {
    expect(() => LinkSchema.parse({ type: 'notion' })).toThrow();
  });

  it('rejects a link with invalid url', () => {
    expect(() => LinkSchema.parse({ url: 'not-a-url' })).toThrow();
  });

  it('rejects a link with invalid type', () => {
    expect(() => LinkSchema.parse({ type: 'slack', url: 'https://example.com' })).toThrow();
  });
});

describe('CoreMetadataSchema', () => {
  const validCore = {
    type: 'function' as const,
    description: 'Authenticates a user',
  };

  it('accepts valid core metadata with required fields only', () => {
    const result = CoreMetadataSchema.parse(validCore);
    expect(result.type).toBe('function');
    expect(result.description).toBe('Authenticates a user');
  });

  it('accepts valid core metadata with all optional fields', () => {
    const full = {
      ...validCore,
      owner: 'auth-team',
      status: 'stable' as const,
      tags: ['auth', 'security'],
      links: [{ url: 'https://example.com', type: 'github' as const }],
    };
    const result = CoreMetadataSchema.parse(full);
    expect(result.owner).toBe('auth-team');
    expect(result.status).toBe('stable');
    expect(result.tags).toEqual(['auth', 'security']);
    expect(result.links).toHaveLength(1);
  });

  it('rejects missing type field', () => {
    expect(() => CoreMetadataSchema.parse({ description: 'A function' })).toThrow();
  });

  it('rejects missing description field', () => {
    expect(() => CoreMetadataSchema.parse({ type: 'function' })).toThrow();
  });

  it('rejects empty description', () => {
    expect(() => CoreMetadataSchema.parse({ type: 'function', description: '' })).toThrow();
  });

  it('rejects invalid type value', () => {
    expect(() => CoreMetadataSchema.parse({ type: 'widget', description: 'A thing' })).toThrow();
  });

  it('accepts empty tags array', () => {
    const result = CoreMetadataSchema.parse({ ...validCore, tags: [] });
    expect(result.tags).toEqual([]);
  });

  it('accepts empty links array', () => {
    const result = CoreMetadataSchema.parse({ ...validCore, links: [] });
    expect(result.links).toEqual([]);
  });
});

describe('ExtendedMetadataSchema', () => {
  const validExtended = {
    type: 'service' as const,
    description: 'Payment processing service',
    owner: 'payments-team',
    status: 'stable' as const,
    context: {
      business_goal: 'Revenue processing',
      funnel_stage: 'revenue' as const,
      revenue_impact: 'critical' as const,
    },
    dependencies: {
      services: ['user-service'],
      external_apis: ['stripe-api'],
      databases: ['postgres-payments'],
    },
    compliance: {
      regulations: ['PCI-DSS', 'SOC2'],
      data_sensitivity: 'restricted' as const,
      audit_requirements: ['transaction-logging'],
    },
    operational: {
      sla: '99.99%',
      on_call_team: 'payments-team',
      monitoring_dashboards: [
        {
          type: 'datadog',
          url: 'https://app.datadoghq.com/dashboard/payments',
          title: 'Payments Dashboard',
        },
      ],
    },
  };

  it('accepts fully populated extended metadata', () => {
    const result = ExtendedMetadataSchema.parse(validExtended);
    expect(result.type).toBe('service');
    expect(result.context?.funnel_stage).toBe('revenue');
    expect(result.dependencies?.services).toEqual(['user-service']);
    expect(result.compliance?.regulations).toEqual(['PCI-DSS', 'SOC2']);
    expect(result.operational?.sla).toBe('99.99%');
  });

  it('accepts extended metadata without optional extended fields', () => {
    const minimal = {
      type: 'function' as const,
      description: 'A simple function',
    };
    const result = ExtendedMetadataSchema.parse(minimal);
    expect(result.context).toBeUndefined();
    expect(result.dependencies).toBeUndefined();
    expect(result.compliance).toBeUndefined();
    expect(result.operational).toBeUndefined();
  });

  it('accepts partial context', () => {
    const result = ExtendedMetadataSchema.parse({
      type: 'function' as const,
      description: 'A function',
      context: { business_goal: 'Growth' },
    });
    expect(result.context?.business_goal).toBe('Growth');
    expect(result.context?.funnel_stage).toBeUndefined();
  });

  it('accepts partial dependencies', () => {
    const result = ExtendedMetadataSchema.parse({
      type: 'function' as const,
      description: 'A function',
      dependencies: { services: ['svc-a'] },
    });
    expect(result.dependencies?.services).toEqual(['svc-a']);
    expect(result.dependencies?.external_apis).toBeUndefined();
  });

  it('rejects invalid funnel stage', () => {
    expect(() => FunnelStageSchema.parse('onboarding')).toThrow();
  });

  it('rejects invalid revenue impact', () => {
    expect(() => RevenueImpactSchema.parse('extreme')).toThrow();
  });

  it('rejects invalid data sensitivity', () => {
    expect(() => DataSensitivitySchema.parse('secret')).toThrow();
  });

  it('rejects invalid monitoring dashboard url', () => {
    expect(() =>
      ExtendedMetadataSchema.parse({
        type: 'service' as const,
        description: 'A service',
        operational: {
          monitoring_dashboards: [{ url: 'not-a-url' }],
        },
      }),
    ).toThrow();
  });

  it('accepts empty arrays in dependencies', () => {
    const result = ExtendedMetadataSchema.parse({
      type: 'function' as const,
      description: 'A function',
      dependencies: {
        services: [],
        external_apis: [],
        databases: [],
      },
    });
    expect(result.dependencies?.services).toEqual([]);
  });

  it('accepts empty arrays in compliance', () => {
    const result = ExtendedMetadataSchema.parse({
      type: 'function' as const,
      description: 'A function',
      compliance: {
        regulations: [],
        audit_requirements: [],
      },
    });
    expect(result.compliance?.regulations).toEqual([]);
  });
});
