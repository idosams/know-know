/**
 * @knowgraph
 * type: module
 * description: User entity model and type definitions for the blog platform
 * owner: platform-team
 * status: stable
 * tags: [users, models, types]
 * compliance:
 *   regulations: [GDPR]
 *   data_sensitivity: confidential
 */

/**
 * @knowgraph
 * type: interface
 * description: Core user entity representing a registered blog platform user
 * owner: platform-team
 * status: stable
 * tags: [users, models, entity]
 * compliance:
 *   regulations: [GDPR]
 *   data_sensitivity: confidential
 */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
  readonly role: 'user' | 'author' | 'admin';
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * @knowgraph
 * type: interface
 * description: Input schema for creating a new user account
 * owner: platform-team
 * status: stable
 * tags: [users, models, input]
 */
export interface CreateUserInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}
