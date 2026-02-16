/**
 * @knowgraph
 * type: module
 * description: Blog post entity model and type definitions
 * owner: content-team
 * status: stable
 * tags: [posts, models, types]
 */

/**
 * @knowgraph
 * type: interface
 * description: Blog post entity representing a published or draft article
 * owner: content-team
 * status: stable
 * tags: [posts, models, entity]
 */
export interface Post {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly content: string;
  readonly excerpt: string | null;
  readonly authorId: string;
  readonly tags: readonly string[];
  readonly status: 'draft' | 'published' | 'archived';
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * @knowgraph
 * type: interface
 * description: Input schema for creating a new blog post
 * owner: content-team
 * status: stable
 * tags: [posts, models, input]
 */
export interface CreatePostInput {
  readonly title: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly publish: boolean;
}

/**
 * @knowgraph
 * type: interface
 * description: Input schema for updating an existing blog post
 * owner: content-team
 * status: stable
 * tags: [posts, models, input]
 */
export interface UpdatePostInput {
  readonly title?: string;
  readonly content?: string;
  readonly tags?: readonly string[];
  readonly status?: 'draft' | 'published' | 'archived';
}
