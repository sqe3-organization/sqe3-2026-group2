import { expect } from 'vitest';
import { z } from 'zod';
import { TimedAxiosResponse } from './notionClient.js';

export const UUIDv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CompactHex32Regex = /^[0-9a-f]{32}$/i;

/**
 * Zod Schema for Notion Bot & Person User Objects (Notion-Version: 2025-09-03)
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
      workspace_limits: z
        .object({
          max_file_upload_size_in_bytes: z.number().int().positive(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Zod Schema for Paginated Workspace User Directory (GET /v1/users)
 */
export const PaginatedUserListSchema = z.object({
  object: z.literal('list'),
  results: z.array(UserObjectSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
  type: z.literal('user'),
  user: z.record(z.unknown()).optional(),
  request_id: z.string().regex(UUIDv4Regex).optional(),
});

/**
 * Zod Schema for Notion Standard Error Payload
 */
export const NotionErrorSchema = z.object({
  object: z.literal('error'),
  status: z.number().int(),
  code: z.string().min(1),
  message: z.string().min(1),
  request_id: z.string().optional(),
});

/**
 * Zod Schema for RFC 7662 OAuth Token Introspection Response (POST /v1/oauth/introspect)
 */
export const OAuthIntrospectSchema = z.object({
  active: z.boolean(),
  scope: z.string().optional(),
  iat: z.number().int().optional(),
  request_id: z.string().optional(),
});

/**
 * Multi-Layer Common Transport & SLA Assertion Helper (replaces Collection-Level [Common] Script)
 */
export function assertCommonHeadersAndSla(response: TimedAxiosResponse, maxSlaMs = 5000): void {
  const contentType = String(response.headers['content-type'] || '');
  expect(contentType.toLowerCase()).toContain('application/json');

  const traceHeader =
    response.headers['x-notion-request-id'] ||
    response.headers['x-request-id'] ||
    response.headers['cf-ray'] ||
    response.data?.request_id;
  expect(Boolean(traceHeader)).toBe(true);

  expect(typeof response.durationMs).toBe('number');
  expect(response.durationMs).toBeLessThan(maxSlaMs);
}

/**
 * Strict Notion Standard Error Contract Validator
 */
export function assertNotionErrorContract(
  response: TimedAxiosResponse,
  expectedStatus: number,
  expectedCode: string
): void {
  expect(response.status).toBe(expectedStatus);
  assertCommonHeadersAndSla(response);

  const parsed = NotionErrorSchema.safeParse(response.data);
  expect(parsed.success, `Expected Notion error schema, got: ${JSON.stringify(response.data)}`).toBe(
    true
  );
  expect(response.data.object).toBe('error');
  expect(response.data.status).toBe(expectedStatus);
  expect(response.data.code).toBe(expectedCode);
  expect(typeof response.data.message).toBe('string');
  expect(response.data.message.length).toBeGreaterThan(0);
}

/**
 * OAuth 2.0 Error Contract Validator (handles both RFC 6749 {"error": "..."} and Notion gateway {"code": "..."})
 */
export function assertOAuthErrorContract(
  response: TimedAxiosResponse,
  expectedStatus: number,
  expectedErrors: string | string[]
): void {
  expect(response.status).toBe(expectedStatus);
  assertCommonHeadersAndSla(response);

  const allowed = Array.isArray(expectedErrors) ? expectedErrors : [expectedErrors];
  const actualErrorCode = response.data?.error || response.data?.code;
  expect(typeof response.data).toBe('object');
  expect(allowed).toContain(actualErrorCode);
}
