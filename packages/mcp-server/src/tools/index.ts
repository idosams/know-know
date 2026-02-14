import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpDatabase } from '../db.js';
import { registerSearchCode } from './search-code.js';
import { registerFindByOwner } from './find-by-owner.js';
import { registerFindByBusinessGoal } from './find-by-business-goal.js';
import { registerGetDependencies } from './get-dependencies.js';
import { registerGetEntityDetails } from './get-entity-details.js';
import { registerGetExternalKnowledge } from './get-external-knowledge.js';
import { registerGraphOverview } from './graph-overview.js';

export function registerAllTools(server: McpServer, db: McpDatabase): void {
  registerSearchCode(server, db);
  registerFindByOwner(server, db);
  registerFindByBusinessGoal(server, db);
  registerGetDependencies(server, db);
  registerGetEntityDetails(server, db);
  registerGetExternalKnowledge(server, db);
  registerGraphOverview(server, db);
}
