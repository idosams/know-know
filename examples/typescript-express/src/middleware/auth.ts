/**
 * @knowgraph
 * type: module
 * description: Express authentication middleware for JWT token validation and user context injection
 * owner: platform-team
 * status: stable
 * tags: [auth, middleware, jwt, security]
 * links:
 *   - type: notion
 *     url: https://notion.so/auth-middleware-spec
 *     title: Auth Middleware Specification
 * context:
 *   business_goal: Secure API access through JWT-based authentication
 *   funnel_stage: activation
 *   revenue_impact: critical
 * dependencies:
 *   services: [auth-service]
 *   databases: [redis-cache]
 * compliance:
 *   regulations: [SOC2]
 *   data_sensitivity: confidential
 */

import { Request, Response, NextFunction } from 'express';

interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * @knowgraph
 * type: function
 * description: Express middleware that validates JWT Bearer tokens and attaches user context to the request
 * owner: platform-team
 * status: stable
 * tags: [auth, middleware, jwt]
 * context:
 *   funnel_stage: activation
 *   revenue_impact: critical
 * compliance:
 *   regulations: [SOC2]
 *   data_sensitivity: confidential
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  // Implementation omitted for example purposes
  req.user = { id: 'usr_example', email: 'user@example.com', role: 'user' };
  next();
}
