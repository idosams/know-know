import Database from 'better-sqlite3';
import { createInMemoryDatabase } from '../db.js';
import type { McpDatabase } from '../db.js';

export interface TestContext {
  readonly db: McpDatabase;
  readonly rawDb: Database.Database;
}

export function createTestDatabase(): TestContext {
  return createInMemoryDatabase();
}

export function seedTestData(rawDb: Database.Database): void {
  const insertEntity = rawDb.prepare(`
    INSERT INTO entities (id, name, file_path, line, column, language, entity_type, description,
      owner, status, tags, signature, parent, raw_docstring, business_goal, funnel_stage,
      revenue_impact, dependencies, compliance, operational, links)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLink = rawDb.prepare(`
    INSERT INTO links (entity_id, type, url, title) VALUES (?, ?, ?, ?)
  `);

  const insertDep = rawDb.prepare(`
    INSERT INTO dependencies (source_id, target_id, dependency_type) VALUES (?, ?, ?)
  `);

  const insertFts = rawDb.prepare(`
    INSERT INTO entities_fts (rowid, name, description, tags, business_goal)
    VALUES (
      (SELECT rowid FROM entities WHERE id = ?),
      ?, ?, ?, ?
    )
  `);

  // Entity 1: Authentication service
  insertEntity.run(
    'auth-service', 'AuthService', 'src/auth/service.ts', 10, 1, 'typescript',
    'service', 'Handles user authentication and session management',
    'platform-team', 'stable', 'auth,security', 'class AuthService', null,
    '/** Handles auth */\n', 'User acquisition and retention',
    'acquisition', 'critical', '{"services": ["user-db"]}',
    '{"regulations": ["GDPR"]}', '{"sla": "99.9%"}', null
  );

  // Entity 2: Payment processor
  insertEntity.run(
    'payment-processor', 'processPayment', 'src/payments/processor.ts', 25, 1, 'typescript',
    'function', 'Processes credit card payments via Stripe',
    'payments-team', 'stable', 'payments,billing', 'function processPayment(amount: number): Promise<Receipt>',
    null, '/** Process payment */\n', 'Revenue processing',
    'revenue', 'critical', '{"external_apis": ["stripe"]}',
    '{"regulations": ["PCI-DSS"]}', '{"on_call_team": "payments-oncall"}', null
  );

  // Entity 3: User model
  insertEntity.run(
    'user-model', 'User', 'src/models/user.ts', 1, 1, 'typescript',
    'interface', 'Represents a user in the system',
    'platform-team', 'stable', 'models,user', 'interface User', null,
    '/** User model */\n', null, null, null, null, null, null, null
  );

  // Entity 4: Logger utility
  insertEntity.run(
    'logger-util', 'Logger', 'src/utils/logger.py', 5, 0, 'python',
    'class', 'Centralized logging utility',
    'infra-team', 'stable', 'logging,utils', 'class Logger', null,
    '"""Logger"""', null, null, null, null, null, null, null
  );

  // Insert FTS entries
  insertFts.run('auth-service', 'AuthService', 'Handles user authentication and session management', 'auth,security', 'User acquisition and retention');
  insertFts.run('payment-processor', 'processPayment', 'Processes credit card payments via Stripe', 'payments,billing', 'Revenue processing');
  insertFts.run('user-model', 'User', 'Represents a user in the system', 'models,user', null);
  insertFts.run('logger-util', 'Logger', 'Centralized logging utility', 'logging,utils', null);

  // Insert links
  insertLink.run('auth-service', 'notion', 'https://notion.so/auth-design', 'Auth Design Doc');
  insertLink.run('auth-service', 'jira', 'https://jira.example.com/AUTH-123', 'Auth Epic');
  insertLink.run('payment-processor', 'confluence', 'https://confluence.example.com/payments', 'Payments Wiki');

  // Insert dependencies
  insertDep.run('auth-service', 'user-model', 'imports');
  insertDep.run('payment-processor', 'auth-service', 'calls');
  insertDep.run('payment-processor', 'logger-util', 'imports');
}
