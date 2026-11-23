// main/api/resources/schemas/blocksSchemas.ts
import { z } from 'zod';
import { NotionErrorSchema, UUIDv4Regex } from './notionSchemas';

export { NotionErrorSchema, UUIDv4Regex };

export const CompactHex32Regex = /^[0-9a-f]{32}$/i;

/**
 * Zod v4 schema for Notion Block Objects (Notion-Version: 2025-09-03).
 * Uses .passthrough() to preserve block-type-specific keys (e.g., paragraph, toggle, to_do).
 */
export const BlockObjectSchema = z
  .object({
    object: z.literal('block'),
    id: z.string().regex(UUIDv4Regex, 'Expected canonical 36-char hyphenated UUIDv4'),
    parent: z.object({
      type: z.string(),
      page_id: z.string().regex(UUIDv4Regex).optional(),
      block_id: z.string().regex(UUIDv4Regex).optional(),
      workspace: z.boolean().optional(),
      database_id: z.string().regex(UUIDv4Regex).optional(),
      data_source_id: z.string().regex(UUIDv4Regex).optional(),
    }),
    type: z.string().min(1),
    created_time: z.string().min(1),
    last_edited_time: z.string().min(1),
    created_by: z.object({
      object: z.literal('user'),
      id: z.string().regex(UUIDv4Regex),
    }),
    last_edited_by: z.object({
      object: z.literal('user'),
      id: z.string().regex(UUIDv4Regex),
    }),
    has_children: z.boolean(),
    archived: z.boolean(),
    in_trash: z.boolean(),
  })
  .passthrough();

/**
 * Zod v4 schema for Paginated Block Children List responses
 * (GET /v1/blocks/{block_id}/children & PATCH /v1/blocks/{block_id}/children).
 */
export const BlockChildrenListSchema = z.object({
  object: z.literal('list'),
  results: z.array(BlockObjectSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
  type: z.literal('block'),
  block: z.record(z.string(), z.unknown()).optional(),
  request_id: z.string().regex(UUIDv4Regex).optional(),
});

export type BlockObject = z.infer<typeof BlockObjectSchema>;
export type BlockChildrenList = z.infer<typeof BlockChildrenListSchema>;
export type NotionError = z.infer<typeof NotionErrorSchema>;
