# TypeScript Express Example

A fully annotated blog platform API demonstrating CodeGraph annotations in TypeScript.

## Project Structure

```
typescript-express/
  src/
    app.ts                   # Express app entry point
    routes/
      users.ts               # User CRUD endpoints
      posts.ts               # Blog post endpoints
      comments.ts            # Comment endpoints
    models/
      User.ts                # User data model
      Post.ts                # Post data model
    middleware/
      auth.ts                # JWT authentication middleware
    services/
      EmailService.ts        # Email notification service
    utils/
      validation.ts          # Input validation utilities
```

## Annotation Highlights

### Business Context

Every module includes business context metadata:

```typescript
/**
 * @codegraph
 * type: module
 * description: Express application entry point for the blog platform API
 * owner: platform-team
 * status: stable
 * context:
 *   business_goal: Content management and publishing platform
 *   funnel_stage: activation
 *   revenue_impact: high
 */
```

### Compliance

User-related modules demonstrate GDPR compliance annotations:

```typescript
/**
 * @codegraph
 * type: class
 * description: User data model with profile and preferences
 * compliance:
 *   regulations: [GDPR]
 *   data_sensitivity: confidential
 */
```

### Dependencies & Operations

Services declare their dependencies and operational metadata:

```typescript
/**
 * @codegraph
 * dependencies:
 *   services: [auth-service, media-service]
 *   databases: [postgres-main, redis-cache]
 * operational:
 *   sla: "99.9%"
 *   on_call_team: platform-team
 */
```

## Try It

```bash
# From the repository root
codegraph index examples/typescript-express
codegraph query --owner "platform-team"
codegraph query "authentication"
```
