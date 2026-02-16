import { describe, it, expect } from 'vitest';
import { createTypescriptParser } from '../typescript-parser.js';

const parser = createTypescriptParser();

describe('TypescriptParser', () => {
  it('has correct name and extensions', () => {
    expect(parser.name).toBe('typescript');
    expect(parser.supportedExtensions).toContain('.ts');
    expect(parser.supportedExtensions).toContain('.tsx');
    expect(parser.supportedExtensions).toContain('.js');
    expect(parser.supportedExtensions).toContain('.jsx');
  });

  describe('class JSDoc', () => {
    it('parses JSDoc with @knowgraph on classes', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: REST controller for user operations
 * owner: platform-team
 * status: stable
 * tags: [users, api]
 */
export class UserController {
}
`;
      const results = parser.parse(content, 'user-controller.ts');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserController');
      expect(results[0]?.entityType).toBe('class');
      expect(results[0]?.metadata.description).toBe('REST controller for user operations');
      expect(results[0]?.metadata.owner).toBe('platform-team');
      expect(results[0]?.language).toBe('typescript');
    });

    it('parses abstract class', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Base repository
 */
export abstract class BaseRepository {
}
`;
      const results = parser.parse(content, 'base-repo.ts');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('BaseRepository');
    });
  });

  describe('function JSDoc', () => {
    it('parses JSDoc with @knowgraph on functions', () => {
      const content = `
/**
 * @knowgraph
 * type: function
 * description: Hashes a password using bcrypt
 * tags: [security, auth]
 */
export async function hashPassword(password: string): Promise<string> {
  return '';
}
`;
      const results = parser.parse(content, 'crypto.ts');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('hashPassword');
      expect(results[0]?.entityType).toBe('function');
      expect(results[0]?.signature).toContain('function hashPassword(password: string)');
      expect(results[0]?.signature).toContain(': Promise<string>');
    });

    it('parses function without return type', () => {
      const content = `
/**
 * @knowgraph
 * type: function
 * description: Logs an event
 */
function logEvent(event: Event) {
}
`;
      const results = parser.parse(content, 'logger.ts');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('logEvent');
      expect(results[0]?.signature).toBe('function logEvent(event: Event)');
    });
  });

  describe('interface JSDoc', () => {
    it('parses exported interfaces', () => {
      const content = `
/**
 * @knowgraph
 * type: interface
 * description: User data transfer object
 * tags: [users, dto]
 */
export interface UserDTO {
  id: string;
  email: string;
}
`;
      const results = parser.parse(content, 'types.ts');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserDTO');
      expect(results[0]?.entityType).toBe('interface');
    });

    it('parses interface with extends', () => {
      const content = `
/**
 * @knowgraph
 * type: interface
 * description: Extended user with admin fields
 */
export interface AdminUser extends UserDTO {
  role: string;
}
`;
      const results = parser.parse(content, 'admin.ts');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('AdminUser');
    });
  });

  describe('method JSDoc', () => {
    it('parses methods inside a class', () => {
      const content = `
export class UserController {
    /**
     * @knowgraph
     * type: method
     * description: Creates a new user account
     * tags: [users, registration]
     */
    async createUser(req: Request): Promise<Response> { }

    /**
     * @knowgraph
     * type: method
     * description: Deletes a user account
     */
    async deleteUser(id: string): Promise<void> { }
}
`;
      const results = parser.parse(content, 'user-controller.ts');
      expect(results).toHaveLength(2);

      const createResult = results.find((r) => r.name === 'createUser');
      expect(createResult?.entityType).toBe('method');
      expect(createResult?.parent).toBe('UserController');
      expect(createResult?.signature).toContain('createUser(req: Request)');
      expect(createResult?.signature).toContain(': Promise<Response>');

      const deleteResult = results.find((r) => r.name === 'deleteUser');
      expect(deleteResult?.entityType).toBe('method');
      expect(deleteResult?.parent).toBe('UserController');
    });
  });

  describe('module-level JSDoc', () => {
    it('handles module-level JSDoc', () => {
      const content = `/**
 * @knowgraph
 * type: module
 * description: Authentication utilities
 * owner: auth-team
 */

import { hash } from 'bcrypt';
`;
      const results = parser.parse(content, 'auth-utils.ts');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('auth-utils');
      expect(results[0]?.entityType).toBe('module');
    });
  });

  describe('type alias JSDoc', () => {
    it('parses type aliases', () => {
      const content = `
/**
 * @knowgraph
 * type: interface
 * description: Valid user roles
 */
export type UserRole = 'admin' | 'user' | 'guest';
`;
      const results = parser.parse(content, 'roles.ts');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserRole');
    });
  });

  describe('enum JSDoc', () => {
    it('parses enum declarations', () => {
      const content = `
/**
 * @knowgraph
 * type: enum
 * description: HTTP status codes used in the app
 */
export enum StatusCode {
  OK = 200,
  NOT_FOUND = 404,
}
`;
      const results = parser.parse(content, 'status.ts');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('StatusCode');
      expect(results[0]?.entityType).toBe('enum');
    });
  });

  describe('error handling', () => {
    it('handles malformed YAML', () => {
      const content = `
/**
 * @knowgraph
 * type: [invalid yaml
 */
export class Broken {}
`;
      const results = parser.parse(content, 'broken.ts');
      expect(results).toHaveLength(0);
    });

    it('handles missing @knowgraph gracefully', () => {
      const content = `
/**
 * This is just a regular JSDoc comment.
 */
export function regularFunction(): void {}
`;
      const results = parser.parse(content, 'regular.ts');
      expect(results).toHaveLength(0);
    });

    it('handles empty file', () => {
      const results = parser.parse('', 'empty.ts');
      expect(results).toHaveLength(0);
    });

    it('handles file with no JSDoc', () => {
      const content = `
const x = 1;
export function simple() { return x; }
`;
      const results = parser.parse(content, 'simple.ts');
      expect(results).toHaveLength(0);
    });
  });

  describe('metadata validation', () => {
    it('validates metadata against schema', () => {
      const content = `
/**
 * @knowgraph
 * type: function
 * description: A function with full metadata
 * owner: core-team
 * status: experimental
 * tags: [util, internal]
 */
export function fullMetadata(): void {}
`;
      const results = parser.parse(content, 'full.ts');
      expect(results).toHaveLength(1);
      expect(results[0]?.metadata.owner).toBe('core-team');
      expect(results[0]?.metadata.status).toBe('experimental');
      expect(results[0]?.metadata.tags).toEqual(['util', 'internal']);
    });

    it('rejects invalid entity type', () => {
      const content = `
/**
 * @knowgraph
 * type: widget
 * description: Not a valid type
 */
export function invalid(): void {}
`;
      const results = parser.parse(content, 'invalid.ts');
      expect(results).toHaveLength(0);
    });
  });
});
