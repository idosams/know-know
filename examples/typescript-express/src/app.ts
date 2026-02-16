/**
 * @knowgraph
 * type: module
 * description: Express application entry point for the blog platform API
 * owner: platform-team
 * status: stable
 * tags: [api, express, blog-platform]
 * links:
 *   - type: notion
 *     url: https://notion.so/blog-platform-api
 *     title: Blog Platform API Architecture
 * context:
 *   business_goal: Content management and publishing platform for blog services
 *   funnel_stage: activation
 *   revenue_impact: high
 * dependencies:
 *   services: [auth-service, media-service]
 *   databases: [postgres-main, redis-cache]
 * operational:
 *   sla: "99.9%"
 *   on_call_team: platform-team
 *   monitoring_dashboards:
 *     - type: grafana
 *       url: https://grafana.example.com/d/blog-api
 *       title: Blog API Dashboard
 */

import express from 'express';
import { userRoutes } from './routes/users';
import { postRoutes } from './routes/posts';
import { commentRoutes } from './routes/comments';
import { authMiddleware } from './middleware/auth';

const app = express();

app.use(express.json());
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/comments', commentRoutes);

export { app };
