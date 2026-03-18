import { z } from 'zod';

/**
 * Shared Zod validation schemas for the blog application.
 * Each task adds its own schemas here — keep additions isolated.
 */

// ─── Comment Schemas ─────────────────────────────────────────────────────────

export const commentSchema = z.object({
  authorName: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  authorEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  content: z.string().trim().min(1, 'Comment is required').max(5000, 'Comment must be 5000 characters or less'),
  postId: z.string().cuid('Invalid post ID'),
});

export type CommentInput = z.infer<typeof commentSchema>;

// ─── Post Schemas ────────────────────────────────────────────────────────────

export const createPostSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().trim().max(500, 'Excerpt must be 500 characters or less').optional().or(z.literal('')),
  coverImage: z.string().optional().or(z.literal('')),
  published: z.boolean().default(false),
  categoryId: z.string().optional().or(z.literal('')),
  tagIds: z.array(z.string()).optional().default([]),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  excerpt: z.string().trim().max(500, 'Excerpt must be 500 characters or less').optional().or(z.literal('')),
  coverImage: z.string().optional().or(z.literal('')),
  published: z.boolean().optional(),
  categoryId: z.string().optional().or(z.literal('')),
  tagIds: z.array(z.string()).optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// ─── Tag & Category Schemas ──────────────────────────────────────────────────

export const tagSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
});

export type TagInput = z.infer<typeof tagSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// ─── Invite Schemas ─────────────────────────────────────────────────────────

export const inviteSchema = z.object({
  email: z.string().trim().email('A valid email address is required').max(255, 'Email must be 255 characters or less'),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export const registerSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  email: z.string().trim().email('A valid email address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be 128 characters or less'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
