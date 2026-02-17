# Parser System

The parser system extracts `@knowgraph` annotations from source code comments and produces structured `ParseResult` objects. It uses a registry pattern to route files to the appropriate language-specific parser based on file extension.

## Architecture

```
parsers/
  types.ts              # Parser and ParserRegistry interfaces
  metadata-extractor.ts # YAML extraction and validation pipeline
  typescript-parser.ts  # TypeScript/JavaScript JSDoc parser
  python-parser.ts      # Python docstring parser
  generic-parser.ts     # Fallback parser for any language
  registry.ts           # Registry that routes files to parsers
  index.ts              # Re-exports
```

Data flows through the parser system as follows:

```
Source file
  --> Registry selects parser by extension
    --> Parser finds comment blocks (JSDoc / docstrings / block comments)
      --> extractKnowgraphYaml() finds @knowgraph marker and strips comment syntax
        --> parseAndValidateMetadata() parses YAML and validates against Zod schemas
          --> ParseResult[] returned with entity name, location, metadata
```

## Interfaces

### Parser

Every language parser implements this interface:

```typescript
export interface Parser {
  readonly name: string;
  readonly supportedExtensions: readonly string[];
  parse(content: string, filePath: string): readonly ParseResult[];
}
```

| Property | Description |
|----------|-------------|
| `name` | Parser identifier (e.g., `'typescript'`, `'python'`, `'generic'`) |
| `supportedExtensions` | File extensions this parser handles (e.g., `['.ts', '.tsx', '.js']`) |
| `parse` | Extracts all `@knowgraph`-annotated entities from file content |

### ParserRegistry

Routes files to the correct parser and provides a unified parse interface:

```typescript
export interface ParserRegistry {
  register(parser: Parser): void;
  getParser(filePath: string): Parser | undefined;
  parseFile(content: string, filePath: string): readonly ParseResult[];
}
```

| Method | Description |
|--------|-------------|
| `register` | Adds a parser to the registry |
| `getParser` | Returns the parser for a given file path (by extension match) |
| `parseFile` | Finds the right parser and runs it; returns empty array if no parser found |

## Metadata Extraction Pipeline

The extraction pipeline is the core of the parser system. It is shared by all parsers.

### Step 1: `extractKnowgraphYaml(commentBlock)`

Finds the `@knowgraph` marker in a comment block and extracts the YAML that follows it.

```typescript
export function extractKnowgraphYaml(commentBlock: string): string | null;
```

**Processing:**
1. Search for `@knowgraph` marker in the text
2. Take everything after the marker
3. Strip comment syntax from each line:
   - JSDoc: remove leading `* ` (asterisk + space)
   - Python/shell: remove leading `# ` (hash + space)
4. Dedent the result (remove common leading whitespace)
5. Trim whitespace

Returns `null` if no `@knowgraph` marker is found.

### Step 2: `parseAndValidateMetadata(yamlString, baseLineOffset?)`

Parses the YAML string and validates against KnowGraph schemas.

```typescript
export function parseAndValidateMetadata(
  yamlString: string,
  baseLineOffset?: number,
): ExtractionResult;
```

**Processing:**
1. Check for empty content
2. Parse YAML using the `yaml` library
3. Validate the result is an object
4. Try `ExtendedMetadataSchema.safeParse()` first (superset of core)
5. If that fails, try `CoreMetadataSchema.safeParse()`
6. If both fail, return validation errors from the extended schema

### Step 3: `extractMetadata(commentBlock, baseLineOffset?)`

Convenience function that combines steps 1 and 2.

```typescript
export function extractMetadata(
  commentBlock: string,
  baseLineOffset?: number,
): ExtractionResult;
```

### ExtractionResult

```typescript
export interface ExtractionResult {
  readonly metadata: CoreMetadata | ExtendedMetadata | null;
  readonly errors: readonly ExtractionError[];
  readonly rawYaml: string;
}

export interface ExtractionError {
  readonly message: string;
  readonly line?: number;
}
```

## TypeScript Parser

Created via `createTypescriptParser()`. Handles TypeScript, JavaScript, TSX, and JSX files.

### Supported Extensions

```typescript
const TS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'];
```

### How It Works

1. **Find JSDoc blocks** using regex: `/\/\*\*[\s\S]*?\*\//g`
2. **Strip JSDoc syntax** (remove `/**`, `*/`, and leading `* ` on each line)
3. **Extract metadata** via `extractMetadata()`
4. **Identify the entity** by examining the next non-empty line after the JSDoc block

### Entity Detection

The parser matches the line immediately following a JSDoc block against these patterns (in order):

| Pattern | Entity Type | Captured Info |
|---------|-------------|---------------|
| `class ClassName` | class | Class name |
| `function funcName(params): ReturnType` | function | Name, params, return type, signature |
| `const name = ... =>` | arrow function | Variable name |
| `interface InterfaceName` | interface | Interface name |
| `type TypeName =` | type alias | Type name |
| `enum EnumName` | enum | Enum name |
| `methodName(params): ReturnType` (indented) | method | Name, params, return type, parent class |

For **methods**, the parser walks backward from the method line to find the enclosing class by looking for a `class` declaration at a lower indentation level.

For **module-level** JSDoc blocks (those appearing before any code other than imports), the entity name is derived from the file name (e.g., `auth-utils.ts` becomes `auth-utils`).

### Example

```typescript
/**
 * @knowgraph
 * type: function
 * description: Hashes a password using bcrypt
 * owner: auth-team
 * tags: [security, auth]
 */
export async function hashPassword(password: string): Promise<string> {
  // ...
}
```

Produces:

```json
{
  "name": "hashPassword",
  "filePath": "crypto.ts",
  "line": 9,
  "column": 1,
  "language": "typescript",
  "entityType": "function",
  "signature": "function hashPassword(password: string): Promise<string>",
  "metadata": {
    "type": "function",
    "description": "Hashes a password using bcrypt",
    "owner": "auth-team",
    "tags": ["security", "auth"]
  }
}
```

## Python Parser

Created via `createPythonParser()`. Handles Python source and stub files.

### Supported Extensions

```typescript
const PYTHON_EXTENSIONS = ['.py', '.pyi'];
```

### How It Works

1. **Find docstrings** using regex: `/("""[\s\S]*?"""|'''[\s\S]*?''')/g`
2. **Strip triple quotes** from the content
3. **Extract metadata** via `extractMetadata()`
4. **Identify the entity** by examining the line immediately **before** the docstring

### Entity Detection

The parser looks at the line above each docstring:

| Pattern | Entity Kind | Captured Info |
|---------|-------------|---------------|
| `def funcName(params) -> ReturnType:` | function or method | Name, params, return type, signature |
| `class ClassName:` or `class ClassName(Base):` | class | Class name |

For **methods**, the parser checks if the `def` line is indented and finds the enclosing class by walking backward to a `class` line at a lower indent level.

For **module-level** docstrings (those at the beginning of the file, preceded only by comments, blank lines, or shebang lines), the entity name is derived from the file name.

**Decorators** are collected by walking backward from the `def`/`class` line, gathering all `@decorator` lines.

### Example

```python
class UserService:
    """
    @knowgraph
    type: class
    description: Service for user operations
    owner: platform-team
    """

    def create_user(self, name: str) -> User:
        """
        @knowgraph
        type: method
        description: Creates a new user
        """
        pass
```

Produces two `ParseResult` objects:
1. `UserService` (class)
2. `create_user` (method, parent=`UserService`)

## Generic Parser

Created via `createGenericParser()`. Acts as a fallback for any file extension not handled by a specific parser.

### Supported Extensions

```typescript
// Empty array -- the registry falls back to this when no specific parser matches
supportedExtensions: []
```

### How It Works

The generic parser finds `@knowgraph` annotations in two kinds of comments:

1. **Block comments**: `/* ... */`, `""" ... """`, `''' ... '''`
2. **Single-line comment groups**: Consecutive lines starting with `//` or `#`

It strips comment syntax, calls `extractMetadata()`, and assigns the module name from the file path. It does **not** attempt to identify specific code entities (classes, functions, etc.) -- all results are named after the file module.

### Language Detection

The generic parser infers the language from the file extension:

| Extension | Language |
|-----------|----------|
| `.go` | go |
| `.rs` | rust |
| `.java` | java |
| `.rb` | ruby |
| `.c`, `.h` | c |
| `.cpp`, `.hpp` | cpp |
| `.cs` | csharp |
| `.php` | php |
| `.sh`, `.bash`, `.zsh` | shell |
| `.lua` | lua |
| `.r`, `.R` | r |
| `.scala` | scala |
| `.ex`, `.exs` | elixir |
| (unknown) | unknown |

## Parser Registry

Created via `createDefaultRegistry()`.

### Default Configuration

The default registry registers two parsers in order:
1. Python parser
2. TypeScript parser

The generic parser is always available as a fallback.

### Extension Resolution

When `getParser(filePath)` is called:
1. Extract the file extension (e.g., `.ts`)
2. Search registered parsers for one whose `supportedExtensions` includes that extension
3. If found, return the specific parser
4. If not found, return the generic parser

### Adding a Custom Parser

```typescript
import { createDefaultRegistry } from '@knowgraph/core';

const registry = createDefaultRegistry();

// Register a custom parser
registry.register({
  name: 'custom-ruby',
  supportedExtensions: ['.rb'],
  parse(content, filePath) {
    // Custom parsing logic
    return [];
  },
});

// The registry now routes .rb files to your custom parser
const parser = registry.getParser('test.rb');
// parser.name === 'custom-ruby'
```

## Exports

All parser-related types and factories are exported from `@knowgraph/core`:

```typescript
import {
  // Types
  type Parser,
  type ParserRegistryInterface,
  type ExtractionError,
  type ExtractionResult,
  // Factories
  createTypescriptParser,
  createPythonParser,
  createGenericParser,
  createDefaultRegistry,
  // Pipeline functions
  extractKnowgraphYaml,
  parseAndValidateMetadata,
  extractMetadata,
} from '@knowgraph/core';
```

Source files:
- `packages/core/src/parsers/types.ts`
- `packages/core/src/parsers/metadata-extractor.ts`
- `packages/core/src/parsers/typescript-parser.ts`
- `packages/core/src/parsers/python-parser.ts`
- `packages/core/src/parsers/generic-parser.ts`
- `packages/core/src/parsers/registry.ts`
