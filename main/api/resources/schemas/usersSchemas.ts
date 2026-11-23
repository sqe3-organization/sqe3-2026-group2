// main/api/resources/schemas/usersSchemas.ts
import { z } from 'zod';
import { NotionErrorSchema, UUIDv4Regex } from './notionSchemas';

export { NotionErrorSchema, UUIDv4Regex };

export const CompactHex32Regex = /^[0-9a-f]{32}$/i;

/**
 * Zod Schema for Notion Person and Bot User objects (Notion-Version: 2025-09-03).
 */
export const UserObjectSchema = z.object({
  object: z.literal('user'),
  id: z.string().regex(UUIDv4Regex, 'Expected canonical 36-char hyphenated UUIDv4'),
  type: z.enum(['person', 'bot']),
  name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  person: z
    .object({
      email: z.string().email().optional(),
    })
    .optional(),
  bot: z
    .object({
      owner: z.object({
        type: z.string(),
        workspace: z.boolean().optional(),
      }),
      workspace_name: z.string().nullable().optional(),
      workspace_id: z.string().optional(),
      workspace_limits: z
        .object({
          max_file_upload_size_in_bytes: z.number().int().positive(),
        })
        .optional(),
    })
    .optional(),
  request_id: z.string().optional(),
});

/**
 * Zod Schema for Paginated Workspace User Directory responses (GET /v1/users).
 */
export const PaginatedUsersListSchema = z.object({
  object: z.literal('list'),
  results: z.array(UserObjectSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
  type: z.literal('user'),
  user: z.record(z.string(), z.unknown()).optional(),
  request_id: z.string().regex(UUIDv4Regex).optional(),
});

export type UserObject = z.infer<typeof UserObjectSchema>;
export type PaginatedUsersList = z.infer<typeof PaginatedUsersListSchema>;
export type NotionError = z.infer<typeof NotionErrorSchema>;
