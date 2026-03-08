import { describe, it, expect } from 'vitest';
import { createPythonParser } from '../python-parser.js';

const parser = createPythonParser();

describe('PythonParser', () => {
  it('has correct name and extensions', () => {
    expect(parser.name).toBe('python');
    expect(parser.supportedExtensions).toContain('.py');
    expect(parser.supportedExtensions).toContain('.pyi');
  });

  describe('module-level docstrings', () => {
    it('parses module-level docstring with @knowgraph', () => {
      const content = `"""
@knowgraph
type: module
description: User authentication service
owner: auth-team
status: stable
tags: [auth, security]
"""

import os
`;
      const { results } = parser.parse(content, 'auth_service.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('auth_service');
      expect(results[0]?.entityType).toBe('module');
      expect(results[0]?.metadata.description).toBe(
        'User authentication service',
      );
      expect(results[0]?.metadata.owner).toBe('auth-team');
      expect(results[0]?.language).toBe('python');
    });

    it('parses module docstring after shebang and comments', () => {
      const content = `#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
@knowgraph
type: module
description: CLI entry point
"""
`;
      const { results } = parser.parse(content, 'cli.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.entityType).toBe('module');
      expect(results[0]?.name).toBe('cli');
    });
  });

  describe('function docstrings', () => {
    it('parses function with @knowgraph docstring', () => {
      const content = `
def authenticate_user(email: str, password: str) -> AuthResult:
    """
    @knowgraph
    type: function
    description: Authenticates user credentials and returns JWT token
    owner: auth-team
    tags: [auth, login]
    """
    pass
`;
      const { results } = parser.parse(content, 'auth.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('authenticate_user');
      expect(results[0]?.entityType).toBe('function');
      expect(results[0]?.metadata.description).toBe(
        'Authenticates user credentials and returns JWT token',
      );
      expect(results[0]?.signature).toContain('def authenticate_user');
      expect(results[0]?.signature).toContain('-> AuthResult');
    });

    it('parses async function', () => {
      const content = `
async def fetch_user(user_id: int) -> User:
    """
    @knowgraph
    type: function
    description: Fetches user from database
    """
    pass
`;
      const { results } = parser.parse(content, 'users.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('fetch_user');
      expect(results[0]?.signature).toContain('def fetch_user');
    });
  });

  describe('class docstrings', () => {
    it('parses class with @knowgraph docstring', () => {
      const content = `
class UserService:
    """
    @knowgraph
    type: class
    description: Service for user operations
    owner: platform-team
    """
    pass
`;
      const { results } = parser.parse(content, 'user_service.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserService');
      expect(results[0]?.entityType).toBe('class');
    });

    it('parses class with methods', () => {
      const content = `
class UserService:
    """
    @knowgraph
    type: class
    description: Service for user operations
    """

    def create_user(self, name: str) -> User:
        """
        @knowgraph
        type: method
        description: Creates a new user
        """
        pass

    def delete_user(self, user_id: int) -> None:
        """
        @knowgraph
        type: method
        description: Deletes a user by ID
        """
        pass
`;
      const { results } = parser.parse(content, 'user_service.py');
      expect(results).toHaveLength(3);

      const classResult = results.find((r) => r.name === 'UserService');
      expect(classResult?.entityType).toBe('class');

      const createResult = results.find((r) => r.name === 'create_user');
      expect(createResult?.entityType).toBe('method');
      expect(createResult?.parent).toBe('UserService');
      expect(createResult?.signature).toContain('def create_user');

      const deleteResult = results.find((r) => r.name === 'delete_user');
      expect(deleteResult?.entityType).toBe('method');
      expect(deleteResult?.parent).toBe('UserService');
    });
  });

  describe('multi-line definitions', () => {
    it('parses class with multi-line base classes', () => {
      const content = `
class UserService(
    BaseService,
    LoggingMixin,
):
    """
    @knowgraph
    type: class
    description: Service with multi-line bases
    """
    pass
`;
      const { results } = parser.parse(content, 'svc.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserService');
      expect(results[0]?.entityType).toBe('class');
    });

    it('parses decorated class with multi-line base classes', () => {
      const content = `
@injectable
class UserService(
    BaseService,
):
    """
    @knowgraph
    type: class
    description: Decorated multi-line class
    """
    pass
`;
      const { results } = parser.parse(content, 'svc.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserService');
      expect(results[0]?.entityType).toBe('class');
    });

    it('parses function with multi-line parameters', () => {
      const content = `
def process_data(
    input_data: dict,
    options: Optional[dict] = None,
) -> Result:
    """
    @knowgraph
    type: function
    description: Process data with many params
    """
    pass
`;
      const { results } = parser.parse(content, 'proc.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('process_data');
      expect(results[0]?.entityType).toBe('function');
      expect(results[0]?.signature).toContain('def process_data');
    });

    it('parses async function with multi-line parameters', () => {
      const content = `
async def fetch_users(
    db: Database,
    filters: dict,
) -> list[User]:
    """
    @knowgraph
    type: function
    description: Fetch users async
    """
    pass
`;
      const { results } = parser.parse(content, 'users.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('fetch_users');
      expect(results[0]?.entityType).toBe('function');
    });

    it('parses method with multi-line parameters inside class', () => {
      const content = `
class UserService:
    """
    @knowgraph
    type: class
    description: User service
    """

    def create_user(
        self,
        name: str,
        email: str,
    ) -> User:
        """
        @knowgraph
        type: method
        description: Create a new user
        """
        pass
`;
      const { results } = parser.parse(content, 'svc.py');
      expect(results).toHaveLength(2);
      const method = results.find((r) => r.name === 'create_user');
      expect(method?.entityType).toBe('method');
      expect(method?.parent).toBe('UserService');
    });
  });

  describe('decorators', () => {
    it('parses function with decorators', () => {
      const content = `
@app.get("/users/{user_id}")
@requires_auth
def get_user(user_id: int) -> User:
    """
    @knowgraph
    type: api_endpoint
    description: Get user by ID
    """
    pass
`;
      const { results } = parser.parse(content, 'routes.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.entityType).toBe('api_endpoint');
      expect(results[0]?.name).toBe('get_user');
    });
  });

  describe('error handling', () => {
    it('handles missing @knowgraph gracefully', () => {
      const content = `
def simple_function():
    """This is just a regular docstring."""
    pass
`;
      const { results } = parser.parse(content, 'simple.py');
      expect(results).toHaveLength(0);
    });

    it('handles malformed YAML gracefully', () => {
      const content = `
def broken():
    """
    @knowgraph
    type: [invalid yaml
    """
    pass
`;
      const { results } = parser.parse(content, 'broken.py');
      expect(results).toHaveLength(0);
    });

    it('handles empty file', () => {
      const { results } = parser.parse('', 'empty.py');
      expect(results).toHaveLength(0);
    });

    it('handles file with no docstrings', () => {
      const content = `
x = 1
y = 2
print(x + y)
`;
      const { results } = parser.parse(content, 'no_docs.py');
      expect(results).toHaveLength(0);
    });

    it('handles invalid entity type in YAML', () => {
      const content = `
def test():
    """
    @knowgraph
    type: invalid_type
    description: This has an invalid type
    """
    pass
`;
      const { results } = parser.parse(content, 'invalid.py');
      expect(results).toHaveLength(0);
    });
  });

  describe('metadata validation', () => {
    it('validates tags as array of strings', () => {
      const content = `
def tagged_func():
    """
    @knowgraph
    type: function
    description: A tagged function
    tags: [alpha, beta, gamma]
    """
    pass
`;
      const { results } = parser.parse(content, 'tagged.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.metadata.tags).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('validates status field', () => {
      const content = `
def stable_func():
    """
    @knowgraph
    type: function
    description: A stable function
    status: stable
    """
    pass
`;
      const { results } = parser.parse(content, 'stable.py');
      expect(results).toHaveLength(1);
      expect(results[0]?.metadata.status).toBe('stable');
    });
  });

  describe('file path handling', () => {
    it('extracts module name from file path', () => {
      const content = `"""
@knowgraph
type: module
description: Test module
"""
`;
      const { results } = parser.parse(content, 'src/utils/helpers.py');
      expect(results[0]?.name).toBe('helpers');
      expect(results[0]?.filePath).toBe('src/utils/helpers.py');
    });

    it('handles .pyi stub files', () => {
      const content = `"""
@knowgraph
type: module
description: Type stubs
"""
`;
      const { results } = parser.parse(content, 'types.pyi');
      expect(results[0]?.name).toBe('types');
    });
  });

  describe('diagnostics', () => {
    it('reports diagnostics for malformed YAML with @knowgraph marker', () => {
      const content = `
def broken():
    """
    @knowgraph
    type: [invalid yaml
    """
    pass
`;
      const { results, diagnostics } = parser.parse(content, 'broken.py');
      expect(results).toHaveLength(0);
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.filePath).toBe('broken.py');
    });

    it('reports diagnostics for invalid entity type', () => {
      const content = `
def test():
    """
    @knowgraph
    type: invalid_type
    description: This has an invalid type
    """
    pass
`;
      const { results, diagnostics } = parser.parse(content, 'invalid.py');
      expect(results).toHaveLength(0);
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.filePath).toBe('invalid.py');
    });

    it('returns empty diagnostics for valid annotations', () => {
      const content = `
def sample():
    """
    @knowgraph
    type: function
    description: A valid function
    """
    pass
`;
      const { results, diagnostics } = parser.parse(content, 'valid.py');
      expect(results).toHaveLength(1);
      expect(diagnostics).toHaveLength(0);
    });

    it('returns empty diagnostics when no @knowgraph marker present', () => {
      const content = `
def sample():
    """Just a regular docstring."""
    pass
`;
      const { results, diagnostics } = parser.parse(content, 'regular.py');
      expect(results).toHaveLength(0);
      expect(diagnostics).toHaveLength(0);
    });
  });
});
