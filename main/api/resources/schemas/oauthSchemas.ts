// main/api/resources/schemas/oauthSchemas.ts
import { z } from 'zod';
import { NotionErrorSchema, UUIDv4Regex } from './notionSchemas';

export { NotionErrorSchema, UUIDv4Regex };

/**
 * Zod Schema for OAuth 2.0 Token Exchange & Refresh responses (POST /v1/oauth/token).
 */
export const OAuthTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('bearer'),
  bot_id: z.string().regex(UUIDv4Regex, 'Expected canonical 36-char hyphenated UUIDv4'),
  workspace_id: z.string().min(1),
  workspace_name: z.string().nullable().optional(),
  workspace_icon: z.string().nullable().optional(),
  duplicated_template_id: z.string().nullable().optional(),
  owner: z.record(z.string(), z.unknown()),
  refresh_token: z.string().min(1).nullable().optional(),
  request_id: z.string().optional(),
});

/**
 * Zod Schema for RFC 7662 OAuth Token Introspection responses (POST /v1/oauth/introspect).
 */
export const OAuthIntrospectResponseSchema = z.object({
  active: z.boolean(),
  scope: z.string().optional(),
  iat: z.number().int().optional(),
  request_id: z.string().optional(),
});

/**
 * Zod Schema for RFC 7009 OAuth Token Revocation acknowledgments (POST /v1/oauth/revoke).
 */
export const OAuthRevokeResponseSchema = z.object({
  request_id: z.string().optional(),
});

/**
 * Zod Schema for RFC 6749 OAuth 2.0 error responses ({"error": "...", "error_description"?: "..."}).
 */
export const Rfc6749OAuthErrorSchema = z.object({
  error: z.string().min(1),
  error_description: z.string().optional(),
  request_id: z.string().optional(),
});

/**
 * Composite OAuth Error Schema accepting both RFC 6749 OAuth errors and Notion gateway errors.
 */
export const OAuthErrorSchema = z.union([Rfc6749OAuthErrorSchema, NotionErrorSchema]);

export type OAuthTokenResponse = z.infer<typeof OAuthTokenResponseSchema>;
export type OAuthIntrospectResponse = z.infer<typeof OAuthIntrospectResponseSchema>;
export type OAuthRevokeResponse = z.infer<typeof OAuthRevokeResponseSchema>;
export type OAuthError = z.infer<typeof OAuthErrorSchema>;
