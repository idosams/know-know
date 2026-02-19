import { describe, it, expect } from 'vitest';
import { createGoParser } from '../go-parser.js';

const parser = createGoParser();

describe('GoParser', () => {
  it('has correct name and extensions', () => {
    expect(parser.name).toBe('go');
    expect(parser.supportedExtensions).toContain('.go');
    expect(parser.supportedExtensions).toHaveLength(1);
  });

  describe('function declarations (line comments)', () => {
    it('parses a function with full signature', () => {
      const content = `package main

// @knowgraph
// type: function
// description: Handles user registration
// owner: auth-team
// status: stable
// tags: [users, registration]
func RegisterUser(w http.ResponseWriter, r *http.Request) error {
}
`;
      const results = parser.parse(content, 'handler.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('RegisterUser');
      expect(results[0]?.entityType).toBe('function');
      expect(results[0]?.metadata.description).toBe('Handles user registration');
      expect(results[0]?.metadata.owner).toBe('auth-team');
      expect(results[0]?.language).toBe('go');
      expect(results[0]?.signature).toBe(
        'func RegisterUser(w http.ResponseWriter, r *http.Request) error',
      );
    });

    it('parses a function with no return type', () => {
      const content = `package main

// @knowgraph
// type: function
// description: Logs an event to stdout
func LogEvent(event string) {
}
`;
      const results = parser.parse(content, 'logger.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('LogEvent');
      expect(results[0]?.signature).toBe('func LogEvent(event string)');
    });

    it('parses a function with multiple return values', () => {
      const content = `package main

// @knowgraph
// type: function
// description: Reads config from disk
func ReadConfig(path string) (*Config, error) {
}
`;
      const results = parser.parse(content, 'config.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('ReadConfig');
      expect(results[0]?.signature).toBe(
        'func ReadConfig(path string) (*Config, error)',
      );
    });

    it('parses a function with no parameters', () => {
      const content = `package main

// @knowgraph
// type: function
// description: Returns a new default config
func NewDefaultConfig() *Config {
}
`;
      const results = parser.parse(content, 'config.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('NewDefaultConfig');
      expect(results[0]?.signature).toBe('func NewDefaultConfig() *Config');
    });
  });

  describe('method declarations with receiver', () => {
    it('parses a method with pointer receiver', () => {
      const content = `package service

// @knowgraph
// type: method
// description: Creates a new user in the database
// owner: platform-team
func (s *UserService) Create(ctx context.Context, user *User) error {
}
`;
      const results = parser.parse(content, 'user_service.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('Create');
      expect(results[0]?.entityType).toBe('method');
      expect(results[0]?.parent).toBe('UserService');
      expect(results[0]?.signature).toBe(
        'func (s UserService) Create(ctx context.Context, user *User) error',
      );
    });

    it('parses a method with value receiver', () => {
      const content = `package model

// @knowgraph
// type: method
// description: Returns a string representation
func (u User) String() string {
}
`;
      const results = parser.parse(content, 'user.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('String');
      expect(results[0]?.entityType).toBe('method');
      expect(results[0]?.parent).toBe('User');
      expect(results[0]?.signature).toBe('func (u User) String() string');
    });

    it('sets parent from receiver type', () => {
      const content = `package repo

// @knowgraph
// type: method
// description: Finds all records
func (r *Repository) FindAll() ([]Record, error) {
}
`;
      const results = parser.parse(content, 'repo.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.parent).toBe('Repository');
    });
  });

  describe('struct declarations', () => {
    it('parses a struct (class type)', () => {
      const content = `package model

// @knowgraph
// type: class
// description: Represents a user in the system
// owner: core-team
// status: stable
// tags: [model, user]
type User struct {
	ID   string
	Name string
}
`;
      const results = parser.parse(content, 'user.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('User');
      expect(results[0]?.entityType).toBe('class');
      expect(results[0]?.metadata.description).toBe('Represents a user in the system');
      expect(results[0]?.metadata.owner).toBe('core-team');
    });
  });

  describe('interface declarations', () => {
    it('parses an interface', () => {
      const content = `package service

// @knowgraph
// type: interface
// description: Repository contract for data access
// tags: [repository, interface]
type UserRepository interface {
	FindByID(id string) (*User, error)
	Save(user *User) error
}
`;
      const results = parser.parse(content, 'repository.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserRepository');
      expect(results[0]?.entityType).toBe('interface');
      expect(results[0]?.metadata.tags).toEqual(['repository', 'interface']);
    });
  });

  describe('constant declarations', () => {
    it('parses a single const declaration', () => {
      const content = `package config

// @knowgraph
// type: constant
// description: Default timeout for HTTP requests
// owner: infra-team
const DefaultTimeout = 30
`;
      const results = parser.parse(content, 'config.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('DefaultTimeout');
      expect(results[0]?.entityType).toBe('constant');
    });

    it('parses a const group declaration', () => {
      const content = `package http

// @knowgraph
// type: constant
// description: HTTP status code constants
const (
	StatusOK       = 200
	StatusNotFound = 404
)
`;
      const results = parser.parse(content, 'status.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('StatusOK');
      expect(results[0]?.entityType).toBe('constant');
    });
  });

  describe('variable declarations', () => {
    it('parses a single var declaration', () => {
      const content = `package main

// @knowgraph
// type: variable
// description: Global logger instance
var Logger *log.Logger
`;
      const results = parser.parse(content, 'main.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('Logger');
      expect(results[0]?.entityType).toBe('variable');
    });

    it('parses a var group declaration', () => {
      const content = `package global

// @knowgraph
// type: variable
// description: Application-wide configuration variables
var (
	AppName = "myapp"
	Version = "1.0.0"
)
`;
      const results = parser.parse(content, 'globals.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('AppName');
      expect(results[0]?.entityType).toBe('variable');
    });
  });

  describe('module-level annotations (package declaration)', () => {
    it('parses module-level annotation before package', () => {
      const content = `// @knowgraph
// type: module
// description: HTTP middleware package
// owner: platform-team
package middleware
`;
      const results = parser.parse(content, 'middleware.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('middleware');
      expect(results[0]?.entityType).toBe('module');
      expect(results[0]?.metadata.owner).toBe('platform-team');
    });

    it('handles module-level block comment before package', () => {
      const content = `/*
@knowgraph
type: module
description: Authentication package
owner: auth-team
*/
package auth
`;
      const results = parser.parse(content, 'auth.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('auth');
      expect(results[0]?.entityType).toBe('module');
    });
  });

  describe('block comment style', () => {
    it('parses block comment annotations', () => {
      const content = `package main

/*
@knowgraph
type: function
description: Processes incoming webhook events
owner: integrations-team
tags: [webhook, events]
*/
func ProcessWebhook(payload []byte) error {
}
`;
      const results = parser.parse(content, 'webhook.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('ProcessWebhook');
      expect(results[0]?.entityType).toBe('function');
      expect(results[0]?.metadata.description).toBe('Processes incoming webhook events');
      expect(results[0]?.metadata.tags).toEqual(['webhook', 'events']);
    });

    it('parses block comment with leading asterisks', () => {
      const content = `package main

/*
 * @knowgraph
 * type: class
 * description: HTTP client wrapper
 */
type HTTPClient struct {
	baseURL string
}
`;
      const results = parser.parse(content, 'client.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('HTTPClient');
      expect(results[0]?.entityType).toBe('class');
    });

    it('parses block comment on struct', () => {
      const content = `package config

/*
@knowgraph
type: class
description: Application configuration
status: stable
*/
type AppConfig struct {
	Port int
	Host string
}
`;
      const results = parser.parse(content, 'config.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('AppConfig');
      expect(results[0]?.entityType).toBe('class');
      expect(results[0]?.metadata.status).toBe('stable');
    });
  });

  describe('multiple annotations in one file', () => {
    it('parses multiple annotations', () => {
      const content = `// @knowgraph
// type: module
// description: User management package
// owner: core-team
package user

// @knowgraph
// type: class
// description: User entity
type User struct {
	ID   string
	Name string
}

// @knowgraph
// type: interface
// description: User storage contract
type UserStore interface {
	Get(id string) (*User, error)
}

// @knowgraph
// type: function
// description: Creates a new user instance
func NewUser(name string) *User {
}

// @knowgraph
// type: method
// description: Validates user data
func (u *User) Validate() error {
}
`;
      const results = parser.parse(content, 'user.go');
      expect(results).toHaveLength(5);

      const moduleResult = results.find((r) => r.entityType === 'module');
      expect(moduleResult?.name).toBe('user');

      const classResult = results.find((r) => r.entityType === 'class');
      expect(classResult?.name).toBe('User');

      const interfaceResult = results.find((r) => r.entityType === 'interface');
      expect(interfaceResult?.name).toBe('UserStore');

      const funcResult = results.find((r) => r.entityType === 'function');
      expect(funcResult?.name).toBe('NewUser');

      const methodResult = results.find((r) => r.entityType === 'method');
      expect(methodResult?.name).toBe('Validate');
      expect(methodResult?.parent).toBe('User');
    });

    it('parses mix of block and line comment annotations', () => {
      const content = `package main

/*
@knowgraph
type: function
description: First function
*/
func First() {
}

// @knowgraph
// type: function
// description: Second function
func Second() {
}
`;
      const results = parser.parse(content, 'mix.go');
      expect(results).toHaveLength(2);

      const first = results.find((r) => r.name === 'First');
      expect(first?.metadata.description).toBe('First function');

      const second = results.find((r) => r.name === 'Second');
      expect(second?.metadata.description).toBe('Second function');
    });
  });

  describe('error handling', () => {
    it('handles empty file', () => {
      const results = parser.parse('', 'empty.go');
      expect(results).toHaveLength(0);
    });

    it('handles file with no annotations', () => {
      const content = `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
`;
      const results = parser.parse(content, 'main.go');
      expect(results).toHaveLength(0);
    });

    it('handles malformed YAML in line comment', () => {
      const content = `package main

// @knowgraph
// type: [invalid yaml
func Broken() {
}
`;
      const results = parser.parse(content, 'broken.go');
      expect(results).toHaveLength(0);
    });

    it('handles malformed YAML in block comment', () => {
      const content = `package main

/*
@knowgraph
type: [invalid yaml
*/
func Broken() {
}
`;
      const results = parser.parse(content, 'broken.go');
      expect(results).toHaveLength(0);
    });

    it('rejects invalid entity type', () => {
      const content = `package main

// @knowgraph
// type: widget
// description: Not a valid type
func Invalid() {
}
`;
      const results = parser.parse(content, 'invalid.go');
      expect(results).toHaveLength(0);
    });

    it('handles comments without @knowgraph marker', () => {
      const content = `package main

// This is a regular Go comment
// describing the function below
func RegularFunc() {
}
`;
      const results = parser.parse(content, 'regular.go');
      expect(results).toHaveLength(0);
    });

    it('handles block comment without @knowgraph marker', () => {
      const content = `package main

/*
This is a regular block comment.
*/
func RegularFunc() {
}
`;
      const results = parser.parse(content, 'regular.go');
      expect(results).toHaveLength(0);
    });
  });

  describe('metadata validation', () => {
    it('validates metadata with owner, status, and tags', () => {
      const content = `package main

// @knowgraph
// type: function
// description: A function with full metadata
// owner: core-team
// status: experimental
// tags: [util, internal]
func FullMetadata() {
}
`;
      const results = parser.parse(content, 'full.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.metadata.owner).toBe('core-team');
      expect(results[0]?.metadata.status).toBe('experimental');
      expect(results[0]?.metadata.tags).toEqual(['util', 'internal']);
    });

    it('validates stable status', () => {
      const content = `package main

// @knowgraph
// type: function
// description: Stable function
// status: stable
func StableFunc() {
}
`;
      const results = parser.parse(content, 'stable.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.metadata.status).toBe('stable');
    });

    it('validates deprecated status', () => {
      const content = `package main

// @knowgraph
// type: function
// description: Deprecated function
// status: deprecated
func OldFunc() {
}
`;
      const results = parser.parse(content, 'old.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.metadata.status).toBe('deprecated');
    });

    it('allows annotation with only required fields', () => {
      const content = `package main

// @knowgraph
// type: function
// description: Minimal annotation
func Minimal() {
}
`;
      const results = parser.parse(content, 'minimal.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.metadata.owner).toBeUndefined();
      expect(results[0]?.metadata.status).toBeUndefined();
      expect(results[0]?.metadata.tags).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles annotation with blank lines before declaration', () => {
      const content = `package main

// @knowgraph
// type: function
// description: Function after blank line

func AfterBlank() {
}
`;
      const results = parser.parse(content, 'blank.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('AfterBlank');
    });

    it('handles annotation at end of file without declaration', () => {
      const content = `package main

func main() {}

// @knowgraph
// type: function
// description: Orphaned annotation`;
      const results = parser.parse(content, 'orphan.go');
      // Should still produce a result (as unknown since it's not module-level)
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('unknown');
    });

    it('correctly sets file path on all results', () => {
      const content = `package main

// @knowgraph
// type: function
// description: Test function
func TestFunc() {
}
`;
      const results = parser.parse(content, 'src/handlers/test.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.filePath).toBe('src/handlers/test.go');
    });

    it('sets column to 1 for all results', () => {
      const content = `package main

// @knowgraph
// type: function
// description: Test function
func TestFunc() {
}
`;
      const results = parser.parse(content, 'test.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.column).toBe(1);
    });

    it('sets language to go for all results', () => {
      const content = `package main

// @knowgraph
// type: function
// description: Test function
func TestFunc() {
}
`;
      const results = parser.parse(content, 'test.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.language).toBe('go');
    });

    it('preserves rawDocstring content', () => {
      const content = `package main

// @knowgraph
// type: function
// description: A documented function
func Documented() {
}
`;
      const results = parser.parse(content, 'doc.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.rawDocstring).toContain('@knowgraph');
      expect(results[0]?.rawDocstring).toContain('type: function');
    });

    it('does not set parent for standalone functions', () => {
      const content = `package main

// @knowgraph
// type: function
// description: A standalone function
func Standalone() {
}
`;
      const results = parser.parse(content, 'standalone.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.parent).toBeUndefined();
    });

    it('does not set signature for non-function entities', () => {
      const content = `package model

// @knowgraph
// type: class
// description: A struct
type MyStruct struct {
}
`;
      const results = parser.parse(content, 'model.go');
      expect(results).toHaveLength(1);
      expect(results[0]?.signature).toBeUndefined();
    });
  });
});
