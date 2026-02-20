/**
 * @knowgraph
 * type: module
 * description: Connector registry that manages and orchestrates external knowledge connectors
 * owner: knowgraph-core
 * status: experimental
 * tags: [connector, registry, factory, orchestration]
 * context:
 *   business_goal: Enable pluggable external knowledge source integration
 *   domain: connectors
 */
import type {
  Connector,
  ConnectorRegistry,
  ConnectorSyncResult,
  SyncAllOptions,
} from './types.js';

function createRegistry(): ConnectorRegistry {
  const connectors: Connector[] = [];

  return {
    register(connector: Connector): void {
      const existing = connectors.findIndex((c) => c.name === connector.name);
      if (existing !== -1) {
        connectors[existing] = connector;
      } else {
        connectors.push(connector);
      }
    },

    getConnector(name: string): Connector | undefined {
      return connectors.find((c) => c.name === name);
    },

    listConnectors(): readonly string[] {
      return connectors.map((c) => c.name);
    },

    async syncAll(options: SyncAllOptions): Promise<readonly ConnectorSyncResult[]> {
      const { configs, dbManager, entityFilter, dryRun, onProgress } = options;
      const results: ConnectorSyncResult[] = [];

      for (const connector of connectors) {
        const config = configs[connector.name];
        if (!config || !config.enabled) {
          continue;
        }

        const validation = connector.validate(config);
        if (!validation.valid) {
          const errorMessages = validation.issues
            .map((i) => `${i.field}: ${i.message}`)
            .join('; ');
          results.push({
            connector: connector.name,
            entitiesProcessed: 0,
            linksAdded: 0,
            linksUpdated: 0,
            errors: [
              {
                entityId: '',
                message: `Configuration invalid: ${errorMessages}`,
                code: 'CONFIG_INVALID',
              },
            ],
            duration: 0,
          });
          continue;
        }

        const result = await connector.sync({
          dbManager,
          config,
          entityFilter,
          dryRun,
        });

        results.push(result);
        onProgress?.(connector.name, result);
      }

      return results;
    },
  };
}

export function createConnectorRegistry(): ConnectorRegistry {
  return createRegistry();
}

export function createDefaultConnectorRegistry(): ConnectorRegistry {
  return createRegistry();
}
