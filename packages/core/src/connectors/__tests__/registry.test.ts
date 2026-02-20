import { describe, it, expect, vi } from 'vitest';
import { createConnectorRegistry, createDefaultConnectorRegistry } from '../registry.js';
import type {
  Connector,
  ConnectorConfig,
  ConnectorSyncOptions,
  ConnectorSyncResult,
} from '../types.js';

function makeConnector(
  name: string,
  overrides: Partial<Connector> = {},
): Connector {
  return {
    name,
    supportedLinkTypes: ['notion'],
    validate: () => ({ valid: true, issues: [] }),
    sync: async () => ({
      connector: name,
      entitiesProcessed: 10,
      linksAdded: 5,
      linksUpdated: 2,
      errors: [],
      duration: 100,
    }),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<ConnectorConfig> = {}): ConnectorConfig {
  return {
    enabled: true,
    api_key_env: 'TEST_API_KEY',
    ...overrides,
  };
}

describe('ConnectorRegistry', () => {
  describe('register', () => {
    it('registers a connector', () => {
      const registry = createConnectorRegistry();
      const connector = makeConnector('notion');
      registry.register(connector);

      expect(registry.getConnector('notion')).toBe(connector);
    });

    it('replaces existing connector with same name', () => {
      const registry = createConnectorRegistry();
      const first = makeConnector('notion');
      const second = makeConnector('notion', {
        supportedLinkTypes: ['notion', 'custom'],
      });

      registry.register(first);
      registry.register(second);

      expect(registry.getConnector('notion')).toBe(second);
      expect(registry.listConnectors()).toHaveLength(1);
    });
  });

  describe('getConnector', () => {
    it('returns undefined for unregistered connector', () => {
      const registry = createConnectorRegistry();
      expect(registry.getConnector('nonexistent')).toBeUndefined();
    });

    it('returns the correct connector by name', () => {
      const registry = createConnectorRegistry();
      const notion = makeConnector('notion');
      const jira = makeConnector('jira', { supportedLinkTypes: ['jira'] });

      registry.register(notion);
      registry.register(jira);

      expect(registry.getConnector('notion')).toBe(notion);
      expect(registry.getConnector('jira')).toBe(jira);
    });
  });

  describe('listConnectors', () => {
    it('returns empty array when no connectors registered', () => {
      const registry = createConnectorRegistry();
      expect(registry.listConnectors()).toEqual([]);
    });

    it('returns names of all registered connectors', () => {
      const registry = createConnectorRegistry();
      registry.register(makeConnector('notion'));
      registry.register(makeConnector('jira'));
      registry.register(makeConnector('linear'));

      const names = registry.listConnectors();
      expect(names).toEqual(['notion', 'jira', 'linear']);
    });
  });

  describe('syncAll', () => {
    it('syncs all enabled connectors', async () => {
      const registry = createConnectorRegistry();
      const notionSync = vi.fn<(options: ConnectorSyncOptions) => Promise<ConnectorSyncResult>>().mockResolvedValue({
        connector: 'notion',
        entitiesProcessed: 10,
        linksAdded: 5,
        linksUpdated: 2,
        errors: [],
        duration: 100,
      });
      const jiraSync = vi.fn<(options: ConnectorSyncOptions) => Promise<ConnectorSyncResult>>().mockResolvedValue({
        connector: 'jira',
        entitiesProcessed: 8,
        linksAdded: 3,
        linksUpdated: 1,
        errors: [],
        duration: 80,
      });

      registry.register(makeConnector('notion', { sync: notionSync }));
      registry.register(makeConnector('jira', { sync: jiraSync }));

      const results = await registry.syncAll({
        dbManager: {} as ConnectorSyncOptions['dbManager'],
        configs: {
          notion: makeConfig(),
          jira: makeConfig(),
        },
        dryRun: false,
      });

      expect(results).toHaveLength(2);
      expect(notionSync).toHaveBeenCalledOnce();
      expect(jiraSync).toHaveBeenCalledOnce();
    });

    it('skips disabled connectors', async () => {
      const registry = createConnectorRegistry();
      const sync = vi.fn<(options: ConnectorSyncOptions) => Promise<ConnectorSyncResult>>();

      registry.register(makeConnector('notion', { sync }));

      const results = await registry.syncAll({
        dbManager: {} as ConnectorSyncOptions['dbManager'],
        configs: {
          notion: makeConfig({ enabled: false }),
        },
        dryRun: false,
      });

      expect(results).toHaveLength(0);
      expect(sync).not.toHaveBeenCalled();
    });

    it('skips connectors without config', async () => {
      const registry = createConnectorRegistry();
      const sync = vi.fn<(options: ConnectorSyncOptions) => Promise<ConnectorSyncResult>>();

      registry.register(makeConnector('notion', { sync }));

      const results = await registry.syncAll({
        dbManager: {} as ConnectorSyncOptions['dbManager'],
        configs: {},
        dryRun: false,
      });

      expect(results).toHaveLength(0);
      expect(sync).not.toHaveBeenCalled();
    });

    it('reports validation errors without syncing', async () => {
      const registry = createConnectorRegistry();
      const sync = vi.fn<(options: ConnectorSyncOptions) => Promise<ConnectorSyncResult>>();

      registry.register(
        makeConnector('notion', {
          sync,
          validate: () => ({
            valid: false,
            issues: [{ field: 'api_key_env', message: 'API key required' }],
          }),
        }),
      );

      const results = await registry.syncAll({
        dbManager: {} as ConnectorSyncOptions['dbManager'],
        configs: { notion: makeConfig() },
        dryRun: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0].errors).toHaveLength(1);
      expect(results[0].errors[0].code).toBe('CONFIG_INVALID');
      expect(sync).not.toHaveBeenCalled();
    });

    it('calls onProgress callback for each synced connector', async () => {
      const registry = createConnectorRegistry();
      registry.register(makeConnector('notion'));
      registry.register(makeConnector('jira'));

      const onProgress = vi.fn();

      await registry.syncAll({
        dbManager: {} as ConnectorSyncOptions['dbManager'],
        configs: {
          notion: makeConfig(),
          jira: makeConfig(),
        },
        dryRun: false,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith('notion', expect.objectContaining({ connector: 'notion' }));
      expect(onProgress).toHaveBeenCalledWith('jira', expect.objectContaining({ connector: 'jira' }));
    });

    it('passes entityFilter and dryRun to connectors', async () => {
      const registry = createConnectorRegistry();
      const sync = vi.fn<(options: ConnectorSyncOptions) => Promise<ConnectorSyncResult>>().mockResolvedValue({
        connector: 'notion',
        entitiesProcessed: 0,
        linksAdded: 0,
        linksUpdated: 0,
        errors: [],
        duration: 0,
      });

      registry.register(makeConnector('notion', { sync }));

      const entityFilter = { owner: 'team-a', tags: ['important'] as readonly string[] };
      await registry.syncAll({
        dbManager: {} as ConnectorSyncOptions['dbManager'],
        configs: { notion: makeConfig() },
        entityFilter,
        dryRun: true,
      });

      expect(sync).toHaveBeenCalledWith(
        expect.objectContaining({
          entityFilter,
          dryRun: true,
        }),
      );
    });
  });

  describe('createDefaultConnectorRegistry', () => {
    it('creates an empty registry', () => {
      const registry = createDefaultConnectorRegistry();
      expect(registry.listConnectors()).toEqual([]);
    });
  });
});
