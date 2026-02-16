/**
 * @knowgraph
 * type: module
 * description: Request validation utilities for Express route handlers
 * owner: platform-team
 * status: stable
 * tags: [validation, middleware, utilities]
 */

import { Request, Response, NextFunction } from 'express';

/**
 * @knowgraph
 * type: function
 * description: Express middleware factory that validates request body against a Zod schema
 * owner: platform-team
 * status: stable
 * tags: [validation, middleware, zod]
 */
export function validateBody(schema: { parse: (data: unknown) => unknown }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: 'Validation failed', details: error });
    }
  };
}

/**
 * @knowgraph
 * type: function
 * description: Express middleware factory that validates query parameters against a Zod schema
 * owner: platform-team
 * status: stable
 * tags: [validation, middleware, query-params]
 */
export function validateQuery(schema: { parse: (data: unknown) => unknown }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as Record<string, string>;
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid query parameters', details: error });
    }
  };
}
