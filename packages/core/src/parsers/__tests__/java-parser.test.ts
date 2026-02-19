import { describe, it, expect } from 'vitest';
import { createJavaParser } from '../java-parser.js';

const parser = createJavaParser();

describe('JavaParser', () => {
  it('has correct name and extensions', () => {
    expect(parser.name).toBe('java');
    expect(parser.supportedExtensions).toContain('.java');
    expect(parser.supportedExtensions).toHaveLength(1);
  });

  describe('class declarations', () => {
    it('parses JavaDoc with @knowgraph on a public class', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: REST controller for user operations
 * owner: platform-team
 * status: stable
 * tags: [users, api]
 */
public class UserController {
}
`;
      const results = parser.parse(content, 'UserController.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserController');
      expect(results[0]?.entityType).toBe('class');
      expect(results[0]?.metadata.description).toBe(
        'REST controller for user operations',
      );
      expect(results[0]?.metadata.owner).toBe('platform-team');
      expect(results[0]?.language).toBe('java');
    });

    it('parses abstract class', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Base repository for data access
 */
public abstract class BaseRepository {
}
`;
      const results = parser.parse(content, 'BaseRepository.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('BaseRepository');
      expect(results[0]?.entityType).toBe('class');
    });

    it('parses class with extends and implements', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Admin user controller
 */
public class AdminController extends BaseController implements Auditable {
}
`;
      const results = parser.parse(content, 'AdminController.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('AdminController');
    });

    it('parses generic class', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Generic repository
 */
public class GenericRepository<T extends Entity> {
}
`;
      const results = parser.parse(content, 'GenericRepository.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('GenericRepository');
    });

    it('parses class with Java annotations before declaration', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: REST controller for user management
 * owner: platform-team
 * status: stable
 * tags: [users, api, rest]
 */
@RestController
@RequestMapping("/api/v1/users")
public class UserController {
}
`;
      const results = parser.parse(content, 'UserController.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserController');
      expect(results[0]?.entityType).toBe('class');
    });

    it('parses final class', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Immutable configuration
 */
public final class AppConfig {
}
`;
      const results = parser.parse(content, 'AppConfig.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('AppConfig');
    });

    it('parses static nested class (package-private)', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Static nested builder
 */
static class Builder {
}
`;
      const results = parser.parse(content, 'Builder.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('Builder');
    });
  });

  describe('interface declarations', () => {
    it('parses interface declaration', () => {
      const content = `
/**
 * @knowgraph
 * type: interface
 * description: Repository contract for user data access
 * tags: [repository, users]
 */
public interface UserRepository {
    User findById(String id);
}
`;
      const results = parser.parse(content, 'UserRepository.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserRepository');
      expect(results[0]?.entityType).toBe('interface');
    });

    it('parses interface with extends', () => {
      const content = `
/**
 * @knowgraph
 * type: interface
 * description: Extended repository with pagination
 */
public interface PaginatedRepository<T> extends BaseRepository<T> {
}
`;
      const results = parser.parse(content, 'PaginatedRepository.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('PaginatedRepository');
    });
  });

  describe('enum declarations', () => {
    it('parses enum declaration', () => {
      const content = `
/**
 * @knowgraph
 * type: enum
 * description: HTTP status codes used in the application
 */
public enum StatusCode {
    OK,
    NOT_FOUND,
    SERVER_ERROR
}
`;
      const results = parser.parse(content, 'StatusCode.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('StatusCode');
      expect(results[0]?.entityType).toBe('enum');
    });

    it('parses enum with implements', () => {
      const content = `
/**
 * @knowgraph
 * type: enum
 * description: User roles with permissions
 */
public enum UserRole implements HasPermissions {
    ADMIN,
    USER,
    GUEST
}
`;
      const results = parser.parse(content, 'UserRole.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserRole');
    });
  });

  describe('record declarations', () => {
    it('parses record declaration (Java 16+)', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Immutable user data transfer object
 * tags: [dto, users]
 */
public record UserDTO(String name, String email) {
}
`;
      const results = parser.parse(content, 'UserDTO.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('UserDTO');
      expect(results[0]?.entityType).toBe('class');
    });

    it('parses record with implements', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Serializable point record
 */
public record Point(int x, int y) {
}
`;
      const results = parser.parse(content, 'Point.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('Point');
    });
  });

  describe('method declarations', () => {
    it('parses method with return type and parameters', () => {
      const content = `
public class UserService {
    /**
     * @knowgraph
     * type: method
     * description: Creates a new user account
     * tags: [users, registration]
     */
    public User createUser(String name, String email) {
        return null;
    }
}
`;
      const results = parser.parse(content, 'UserService.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('createUser');
      expect(results[0]?.entityType).toBe('method');
      expect(results[0]?.parent).toBe('UserService');
      expect(results[0]?.signature).toContain('createUser');
      expect(results[0]?.signature).toContain('String name, String email');
    });

    it('parses method with Java annotations between doc and declaration', () => {
      const content = `
public class UserController {
    /**
     * @knowgraph
     * type: method
     * description: Creates a new user
     */
    @PostMapping
    @ResponseStatus(201)
    public User create(@RequestBody CreateUserRequest request) {
        return null;
    }
}
`;
      const results = parser.parse(content, 'UserController.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('create');
      expect(results[0]?.entityType).toBe('method');
      expect(results[0]?.parent).toBe('UserController');
    });

    it('parses private method', () => {
      const content = `
public class Validator {
    /**
     * @knowgraph
     * type: method
     * description: Validates email format
     */
    private boolean validateEmail(String email) {
        return false;
    }
}
`;
      const results = parser.parse(content, 'Validator.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('validateEmail');
      expect(results[0]?.signature).toContain('private');
      expect(results[0]?.signature).toContain('boolean');
    });

    it('parses protected method', () => {
      const content = `
public class BaseService {
    /**
     * @knowgraph
     * type: method
     * description: Hook for subclasses to customize behavior
     */
    protected void onInit() {
    }
}
`;
      const results = parser.parse(content, 'BaseService.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('onInit');
      expect(results[0]?.signature).toContain('protected');
    });

    it('parses static method', () => {
      const content = `
public class MathUtils {
    /**
     * @knowgraph
     * type: method
     * description: Clamps a value to a range
     */
    public static int clamp(int value, int min, int max) {
        return 0;
    }
}
`;
      const results = parser.parse(content, 'MathUtils.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('clamp');
      expect(results[0]?.signature).toContain('static');
      expect(results[0]?.signature).toContain('int clamp');
    });

    it('parses abstract method', () => {
      const content = `
public abstract class Shape {
    /**
     * @knowgraph
     * type: method
     * description: Calculates the area of the shape
     */
    public abstract double area();
}
`;
      const results = parser.parse(content, 'Shape.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('area');
      expect(results[0]?.parent).toBe('Shape');
      expect(results[0]?.signature).toContain('abstract');
    });

    it('parses generic method', () => {
      const content = `
public class CollectionUtils {
    /**
     * @knowgraph
     * type: method
     * description: Finds first element matching predicate
     */
    public <T> T findFirst(List<T> items, Predicate<T> predicate) {
        return null;
    }
}
`;
      const results = parser.parse(content, 'CollectionUtils.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('findFirst');
      expect(results[0]?.signature).toContain('<T>');
    });

    it('parses method returning array type', () => {
      const content = `
public class DataLoader {
    /**
     * @knowgraph
     * type: method
     * description: Loads all records from storage
     */
    public String[] loadAll() {
        return null;
    }
}
`;
      const results = parser.parse(content, 'DataLoader.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('loadAll');
      expect(results[0]?.signature).toContain('String[]');
    });

    it('parses synchronized method', () => {
      const content = `
public class Counter {
    /**
     * @knowgraph
     * type: method
     * description: Thread-safe increment
     */
    public synchronized int increment() {
        return 0;
    }
}
`;
      const results = parser.parse(content, 'Counter.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('increment');
      expect(results[0]?.signature).toContain('synchronized');
    });
  });

  describe('enclosing class detection', () => {
    it('detects enclosing class for method', () => {
      const content = `
public class OrderService {
    /**
     * @knowgraph
     * type: method
     * description: Processes an order
     */
    public void processOrder(Order order) {
    }
}
`;
      const results = parser.parse(content, 'OrderService.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.parent).toBe('OrderService');
    });

    it('detects enclosing interface for default method', () => {
      const content = `
public interface Loggable {
    /**
     * @knowgraph
     * type: method
     * description: Default logging implementation
     */
    default void log(String message) {
    }
}
`;
      const results = parser.parse(content, 'Loggable.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.parent).toBe('Loggable');
    });
  });

  describe('module-level annotation', () => {
    it('handles module-level JavaDoc with package declaration', () => {
      const content = `/**
 * @knowgraph
 * type: module
 * description: User management module
 * owner: platform-team
 */
package com.example.users;

import java.util.List;
`;
      const results = parser.parse(content, 'package-info.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('com.example.users');
      expect(results[0]?.entityType).toBe('module');
      expect(results[0]?.language).toBe('java');
    });

    it('handles module-level JavaDoc without package (uses filename)', () => {
      const content = `/**
 * @knowgraph
 * type: module
 * description: Utility module
 * owner: core-team
 */

import java.util.Map;
`;
      const results = parser.parse(content, 'Utils.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('Utils');
      expect(results[0]?.entityType).toBe('module');
    });
  });

  describe('multiple entities in one file', () => {
    it('parses multiple annotated entities', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Service for user operations
 * owner: platform-team
 * status: stable
 */
public class UserService {

    /**
     * @knowgraph
     * type: method
     * description: Finds a user by ID
     * tags: [users, query]
     */
    public User findById(String id) {
        return null;
    }

    /**
     * @knowgraph
     * type: method
     * description: Deletes a user account
     * tags: [users, mutation]
     */
    public void deleteUser(String id) {
    }
}
`;
      const results = parser.parse(content, 'UserService.java');
      expect(results).toHaveLength(3);

      const classResult = results.find((r) => r.name === 'UserService');
      expect(classResult?.entityType).toBe('class');

      const findResult = results.find((r) => r.name === 'findById');
      expect(findResult?.entityType).toBe('method');
      expect(findResult?.parent).toBe('UserService');

      const deleteResult = results.find((r) => r.name === 'deleteUser');
      expect(deleteResult?.entityType).toBe('method');
      expect(deleteResult?.parent).toBe('UserService');
    });
  });

  describe('error handling', () => {
    it('handles empty file', () => {
      const results = parser.parse('', 'Empty.java');
      expect(results).toHaveLength(0);
    });

    it('handles file with no annotations', () => {
      const content = `
package com.example;

public class SimpleClass {
    public void doStuff() {
        System.out.println("hello");
    }
}
`;
      const results = parser.parse(content, 'SimpleClass.java');
      expect(results).toHaveLength(0);
    });

    it('handles file with no JavaDoc at all', () => {
      const content = `
// Just a line comment
public class NoDoc {
    int x = 1;
}
`;
      const results = parser.parse(content, 'NoDoc.java');
      expect(results).toHaveLength(0);
    });

    it('handles regular JavaDoc without @knowgraph', () => {
      const content = `
/**
 * This is just a regular JavaDoc comment.
 * No @knowgraph marker here.
 */
public class RegularDoc {
}
`;
      const results = parser.parse(content, 'RegularDoc.java');
      expect(results).toHaveLength(0);
    });

    it('handles malformed YAML', () => {
      const content = `
/**
 * @knowgraph
 * type: [invalid yaml
 */
public class Broken {
}
`;
      const results = parser.parse(content, 'Broken.java');
      expect(results).toHaveLength(0);
    });

    it('rejects invalid entity type', () => {
      const content = `
/**
 * @knowgraph
 * type: widget
 * description: Not a valid type
 */
public class Invalid {
}
`;
      const results = parser.parse(content, 'Invalid.java');
      expect(results).toHaveLength(0);
    });
  });

  describe('metadata validation', () => {
    it('validates full metadata including owner, status, and tags', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: A class with full metadata
 * owner: core-team
 * status: experimental
 * tags: [util, internal]
 */
public class FullMetadata {
}
`;
      const results = parser.parse(content, 'FullMetadata.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.metadata.owner).toBe('core-team');
      expect(results[0]?.metadata.status).toBe('experimental');
      expect(results[0]?.metadata.tags).toEqual(['util', 'internal']);
    });

    it('parses deprecated status', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Legacy class scheduled for removal
 * status: deprecated
 */
public class LegacyService {
}
`;
      const results = parser.parse(content, 'LegacyService.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.metadata.status).toBe('deprecated');
    });

    it('parses stable status', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Stable production class
 * status: stable
 */
public class ProductionService {
}
`;
      const results = parser.parse(content, 'ProductionService.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.metadata.status).toBe('stable');
    });
  });

  describe('abstract classes and methods', () => {
    it('parses abstract class with abstract method', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Abstract shape base class
 * tags: [geometry, abstract]
 */
public abstract class Shape {

    /**
     * @knowgraph
     * type: method
     * description: Calculates the perimeter
     */
    public abstract double perimeter();

    /**
     * @knowgraph
     * type: method
     * description: Returns string representation
     */
    public String describe() {
        return "shape";
    }
}
`;
      const results = parser.parse(content, 'Shape.java');
      expect(results).toHaveLength(3);

      const shapeResult = results.find((r) => r.name === 'Shape');
      expect(shapeResult?.entityType).toBe('class');

      const perimeterResult = results.find((r) => r.name === 'perimeter');
      expect(perimeterResult?.entityType).toBe('method');
      expect(perimeterResult?.parent).toBe('Shape');

      const describeResult = results.find((r) => r.name === 'describe');
      expect(describeResult?.entityType).toBe('method');
      expect(describeResult?.parent).toBe('Shape');
    });
  });

  describe('complex annotation skipping', () => {
    it('skips multiple Java annotations with parameters', () => {
      const content = `
public class ApiController {
    /**
     * @knowgraph
     * type: method
     * description: Creates a new resource
     */
    @PostMapping("/resources")
    @ResponseStatus(HttpStatus.CREATED)
    @Validated
    public Resource createResource(@Valid @RequestBody ResourceDTO dto) {
        return null;
    }
}
`;
      const results = parser.parse(content, 'ApiController.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('createResource');
      expect(results[0]?.parent).toBe('ApiController');
    });

    it('skips class-level annotations', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Spring service component
 */
@Service
@Transactional
@Slf4j
public class PaymentService {
}
`;
      const results = parser.parse(content, 'PaymentService.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('PaymentService');
    });
  });

  describe('rawDocstring', () => {
    it('stores stripped JavaDoc content in rawDocstring', () => {
      const content = `
/**
 * @knowgraph
 * type: class
 * description: Test class
 */
public class TestDoc {
}
`;
      const results = parser.parse(content, 'TestDoc.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.rawDocstring).toContain('@knowgraph');
      expect(results[0]?.rawDocstring).toContain('type: class');
      expect(results[0]?.rawDocstring).not.toContain('/**');
      expect(results[0]?.rawDocstring).not.toContain('*/');
    });
  });

  describe('line numbers', () => {
    it('reports correct line numbers for declarations', () => {
      const content = `package com.example;

import java.util.List;

/**
 * @knowgraph
 * type: class
 * description: User entity
 */
public class User {
}
`;
      const results = parser.parse(content, 'User.java');
      expect(results).toHaveLength(1);
      // The class declaration is on line 10
      expect(results[0]?.line).toBe(10);
    });
  });

  describe('column always 1', () => {
    it('always sets column to 1', () => {
      const content = `
public class Outer {
    /**
     * @knowgraph
     * type: method
     * description: An inner method
     */
    public void innerMethod() {
    }
}
`;
      const results = parser.parse(content, 'Outer.java');
      expect(results).toHaveLength(1);
      expect(results[0]?.column).toBe(1);
    });
  });
});
