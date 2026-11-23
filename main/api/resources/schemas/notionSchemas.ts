// main/api/resources/schemas/notionSchemas.ts
import { z } from 'zod';

export const UUIDv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const NotionErrorSchema = z.object({
  object: z.literal('error'),
  status: z.number().int(),
  code: z.string().min(1),
  message: z.string().min(1),
  request_id: z.string().optional(),
});

export const PaginatedListSchema = z.object({
  object: z.literal('list'),
  results: z.array(z.record(z.string(), z.any())), 
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
  request_id: z.string().optional(),
});