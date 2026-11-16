import { expect } from 'vitest';
import { z } from 'zod';

// Zod contracts of the Pages module (Notion-Version 2025-09-03)
export const PageUUIDRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IsoDate = z.string().refine((s) => new Date(s).toISOString() === s, 'ISO 8601 timestamp');

export const PageParentSchema = z.object({
  type: z.enum(['page_id', 'data_source_id', 'database_id', 'workspace', 'block_id']),
});

export const PageObjectSchema = z.object({
  object: z.literal('page'),
  id: z.string().regex(PageUUIDRegex),
  created_time: IsoDate,
  last_edited_time: IsoDate,
  created_by: z.object({ object: z.literal('user'), id: z.string() }),
  last_edited_by: z.object({ object: z.literal('user'), id: z.string() }),
  parent: PageParentSchema,
  in_trash: z.boolean(),
  properties: z.record(z.string(), z.object({ id: z.string(), type: z.string() })),
  url: z.string().url(),
});

export const NotionErrorSchema = z.object({
  object: z.literal('error'),
  status: z.number().int(),
  code: z.string().min(1),
  message: z.string().min(1),
});

export const PropertyItemSchema = z.object({
  object: z.literal('property_item'),
  id: z.string(),
  type: z.string(),
});

export const PropertyItemListSchema = z.object({
  object: z.literal('list'),
  results: z.array(z.object({ object: z.literal('property_item'), type: z.string() })),
  has_more: z.boolean(),
  next_cursor: z.string().nullable(),
});

// Layer 4. Inbound type validation of a page object, with the Zod issues in the failure message
export function expectPageSchema(body: unknown) {
  const parsed = PageObjectSchema.safeParse(body);
  expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true);
}

// Layer 4. Inbound type validation of a single property item
export function expectPropertyItemSchema(body: unknown) {
  const parsed = PropertyItemSchema.safeParse(body);
  expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true);
}
