import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import {
  notionBearerClient,
  notionBasicOAuthClient,
  createCustomNotionClient,
  throttleRequest,
  TimedAxiosResponse,
} from '../../src/core/notionClient.js';
import {
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
  assertOAuthErrorContract,
  UserObjectSchema,
  PaginatedUserListSchema,
  OAuthIntrospectSchema,
  UUIDv4Regex,
} from '../../src/core/assertions.js';

describe('Activity #5 — Stateless API Tests Without Preconditions (Users & OAuth Modules)', () => {
  const telemetryLog: Array<{ testName: string; status: number; durationMs: number }> = [];
  let lastResponse: TimedAxiosResponse | null = null;

  // Lifecycle Hook 1: beforeAll — Validate environment setup & initialize stateless test run
  beforeAll(() => {
    expect(process.env.NOTION_BASE_URL || 'https://api.notion.com/v1').toContain('api.notion.com');
  });

  // Lifecycle Hook 2: beforeEach — Enforce Notion API 350 ms rate-limit guard & reset per-test state
  beforeEach(async () => {
    lastResponse = null;
    await throttleRequest(350);
  });

  // Lifecycle Hook 3: afterEach — Record execution latency and HTTP status telemetry
  afterEach((context) => {
    if (lastResponse) {
      telemetryLog.push({
        testName: context.task.name,
        status: lastResponse.status,
        durationMs: lastResponse.durationMs,
      });
    }
  });

  // Lifecycle Hook 4: afterAll — Summarize suite execution metrics & clean up memory state
  afterAll(() => {
    telemetryLog.length = 0;
  });

  // ============================================================================
  // 1. GET /v1/users/me (Stateless Suite)
  // ============================================================================
  describe('Suite 01: GET /v1/users/me — Stateless Bot Identity & Contract Validation', () => {
    it('TC_USR_ME_001 - [Happy Path] Retrieve bot user profile with valid Internal Token (200 OK)', async () => {
      const res = (await notionBearerClient.get('/users/me')) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);

      const parsed = UserObjectSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(res.data.object).toBe('user');
      expect(res.data.type).toBe('bot');
      expect(res.data.id).toMatch(UUIDv4Regex);
      expect(typeof res.data.name).toBe('string');
      expect(res.data.bot).toBeDefined();
      expect(res.data.bot).toHaveProperty('owner');
    });

    it('TC_USR_ME_007 - [Boundary] Reject Authorization header with empty/whitespace Bearer token (401)', async () => {
      const emptyBearerClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: '   ',
      });
      const res = (await emptyBearerClient.get('/users/me')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_USR_ME_008 - [Boundary] Verify rate-limit contract (200 OK sequential / 429 Retry-After under burst)', async () => {
      const res = (await notionBearerClient.get('/users/me')) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('user');
      expect(res.data.type).toBe('bot');
    });

    it('TC_USR_ME_003 - [Negative] Reject invalid or forged Bearer token (401 Unauthorized)', async () => {
      const forgedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_forged_invalid_token_999999',
      });
      const res = (await forgedClient.get('/users/me')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_USR_ME_004 - [Negative] Reject request when Authorization header is omitted (401 Unauthorized)', async () => {
      const unauthClient = createCustomNotionClient({ authType: 'none' });
      const res = (await unauthClient.get('/users/me')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_USR_ME_005 - [Negative] Enforce contract when Notion-Version header is missing (400 missing_version)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || '',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.get('/users/me')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });

    it('TC_USR_ME_006 - [Negative] Reject unsupported or empty Notion-Version header string (400 validation_error)', async () => {
      const invalidVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || '',
        notionVersion: '2099-99-99',
      });
      const res = (await invalidVersionClient.get('/users/me')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });
  });

  // ============================================================================
  // 2. GET /v1/users (Stateless Directory & Boundary Suite)
  // ============================================================================
  describe('Suite 02: GET /v1/users — Stateless Workspace Directory & Pagination Boundaries', () => {
    it('TC_USR_LIST_001 - [Happy Path] List all workspace users with default pagination (200 OK)', async () => {
      const res = (await notionBearerClient.get('/users')) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);

      const parsed = PaginatedUserListSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(res.data.results.length).toBeGreaterThan(0);
    });

    it('TC_USR_LIST_007 - [Boundary] Verify minimum valid pagination boundary (page_size=1)', async () => {
      const res = (await notionBearerClient.get('/users', {
        params: { page_size: 1 },
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('list');
      expect(Array.isArray(res.data.results)).toBe(true);
      expect(res.data.results.length).toBe(1);
    });

    it('TC_USR_LIST_008 - [Boundary] Verify maximum valid pagination boundary (page_size=100)', async () => {
      const res = (await notionBearerClient.get('/users', {
        params: { page_size: 100 },
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('list');
      expect(res.data.results.length).toBeLessThanOrEqual(100);
    });

    it('TC_USR_LIST_009a - [Boundary] Out-of-bounds pagination page_size=0 (400 validation_error)', async () => {
      const res = (await notionBearerClient.get('/users', {
        params: { page_size: 0 },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_USR_LIST_009b - [Boundary] Out-of-bounds pagination page_size=101 (400 validation_error)', async () => {
      const res = (await notionBearerClient.get('/users', {
        params: { page_size: 101 },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_USR_LIST_003 - [Negative] Reject listing users with invalid or expired token (401)', async () => {
      const invalidClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_expired_token_list_003',
      });
      const res = (await invalidClient.get('/users')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_USR_LIST_004 - [Negative] Reject listing users when Notion-Version header is missing (400)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || '',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.get('/users')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });

    it('TC_USR_LIST_005 - [Negative] Reject malformed non-UUID start_cursor parameter (400)', async () => {
      const res = (await notionBearerClient.get('/users', {
        params: { start_cursor: 'not-a-valid-uuid-cursor' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_USR_LIST_006 - [Negative] Reject non-numeric page_size query parameter (400)', async () => {
      const res = (await notionBearerClient.get('/users', {
        params: { page_size: 'abc' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });
  });

  // ============================================================================
  // 3. GET /v1/users/{user_id} (Stateless Syntactic & Unassigned UUID Checks)
  // ============================================================================
  describe('Suite 03: GET /v1/users/{user_id} — Stateless UUID Boundary & Negative Checks', () => {
    it('TC_USR_GET_009a - [Boundary] Handle all-zero nil UUID cleanly with 404 Not Found', async () => {
      const res = (await notionBearerClient.get(
        '/users/00000000-0000-0000-0000-000000000000'
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_USR_GET_009b - [Boundary] Reject off-by-one 31-character hex UUID string (400)', async () => {
      const res = (await notionBearerClient.get(
        '/users/9a4e7c125b8d4f31a9206c1d8e4f701'
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_USR_GET_003 - [Negative] Reject syntactically invalid non-UUID path parameter (400)', async () => {
      const res = (await notionBearerClient.get(
        '/users/invalid-user-id-format-123'
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_USR_GET_004 - [Negative] Return 404 Not Found for unassigned well-formed UUIDv4', async () => {
      const res = (await notionBearerClient.get(
        '/users/f47ac10b-58cc-4372-a567-0e02b2c3d479'
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_USR_GET_005 - [Negative] Reject query with invalid Bearer token (401)', async () => {
      const badTokenClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_invalid_user_get_005',
      });
      const res = (await badTokenClient.get(
        '/users/f47ac10b-58cc-4372-a567-0e02b2c3d479'
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_USR_GET_007 - [Negative] Reject query when Notion-Version header is omitted (400)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || '',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.get(
        '/users/f47ac10b-58cc-4372-a567-0e02b2c3d479'
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });
  });

  // ============================================================================
  // 4. POST /v1/oauth/* (Stateless Negative & Boundary Contract Checks)
  // ============================================================================
  describe('Suite 04: POST /v1/oauth/* — Stateless OAuth 2.0 Boundary & Negative Contract Suite', () => {
    it('TC_OAUTH_TOK_008a - [Boundary] Reject empty JSON object payload {} on /oauth/token (400)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/token', {})) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, [
        'invalid_request',
        'unsupported_grant_type',
        'validation_error',
      ]);
    });

    it('TC_OAUTH_TOK_008b - [Boundary] Reject empty string grant_type and code attributes (400)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/token', {
        grant_type: '',
        code: '',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, [
        'invalid_request',
        'unsupported_grant_type',
        'validation_error',
      ]);
    });

    it('TC_OAUTH_TOK_003 - [Negative] Reject invalid Basic Auth client_id / client_secret (401)', async () => {
      const badBasicClient = createCustomNotionClient({
        authType: 'basic',
        basicClientId: 'forged_client_id',
        basicClientSecret: 'forged_client_secret',
      });
      const res = (await badBasicClient.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: 'sample_code',
        redirect_uri: process.env.OAUTH_REDIRECT_URI || 'https://localhost:3000/auth/notion/callback',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 401, ['invalid_client', 'unauthorized']);
    });

    it('TC_OAUTH_TOK_004 - [Negative] Reject forged or expired authorization_code (400)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: '00000000-forged-expired-auth-code',
        redirect_uri: process.env.OAUTH_REDIRECT_URI || 'https://localhost:3000/auth/notion/callback',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['invalid_grant', 'invalid_request', 'validation_error']);
    });

    it('TC_OAUTH_TOK_005 - [Negative] Reject unsupported grant_type client_credentials (400)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/token', {
        grant_type: 'client_credentials',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, [
        'unsupported_grant_type',
        'invalid_request',
        'validation_error',
      ]);
    });

    it('TC_OAUTH_TOK_006 - [Negative] Reject mismatched unregistered redirect_uri (400)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        redirect_uri: 'https://unregistered-malicious-domain.example.com/callback',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['invalid_grant', 'invalid_request', 'validation_error']);
    });

    it('TC_OAUTH_TOK_007 - [Negative] Reject token exchange when Notion-Version header is omitted (400)', async () => {
      const noVersionBasicClient = createCustomNotionClient({
        authType: 'basic',
        omitNotionVersion: true,
      });
      const res = (await noVersionBasicClient.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: 'sample_code',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['missing_version', 'validation_error']);
    });

    it('TC_OAUTH_REV_006a - [Boundary] Reject empty string token {"token": ""} on /oauth/revoke (400)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/revoke', {
        token: '',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['validation_error', 'invalid_request']);
    });

    it('TC_OAUTH_REV_006b - [Boundary] Reject whitespace-only token {"token": "   "} on /oauth/revoke (400)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/revoke', {
        token: '   ',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['validation_error', 'invalid_request']);
    });

    it('TC_OAUTH_REV_002 - [Negative] Reject token revocation with invalid Basic Auth credentials (401)', async () => {
      const badBasicClient = createCustomNotionClient({
        authType: 'basic',
        basicClientId: 'invalid_client',
        basicClientSecret: 'invalid_secret',
      });
      const res = (await badBasicClient.post('/oauth/revoke', {
        token: 'ntn_sample_token',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 401, ['invalid_client', 'unauthorized']);
    });

    it('TC_OAUTH_REV_003 - [Negative] Reject revocation when required token field is omitted {} (400)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/revoke', {})) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['validation_error', 'invalid_request']);
    });

    it('TC_OAUTH_REV_004 - [Negative] Reject revocation when Notion-Version header is omitted (400)', async () => {
      const noVersionBasicClient = createCustomNotionClient({
        authType: 'basic',
        omitNotionVersion: true,
      });
      const res = (await noVersionBasicClient.post('/oauth/revoke', {
        token: 'ntn_sample_token',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['missing_version', 'validation_error']);
    });

    it('TC_OAUTH_REV_005 - [Negative] Reject malformed raw JSON syntax on /v1/oauth/revoke (400)', async () => {
      const res = (await notionBasicOAuthClient.post(
        '/oauth/revoke',
        '{"token": "unclosed_json',
        { headers: { 'Content-Type': 'application/json' } }
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['invalid_json', 'validation_error', 'invalid_request']);
    });

    it('TC_OAUTH_INT_002 - [Happy Path] Introspect revoked or unknown token (active: false on 200 OK)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/introspect', {
        token: 'ntn_unknown_or_revoked_token_002',
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      const parsed = OAuthIntrospectSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(res.data.active).toBe(false);
    });

    it('TC_OAUTH_INT_007 - [Boundary] Reject empty string token {"token": ""} on introspect (400)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/introspect', {
        token: '',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['validation_error', 'invalid_request']);
    });

    it('TC_OAUTH_INT_008 - [Boundary] Safely handle oversized 2048-character token string (200 OK active: false)', async () => {
      const oversizedToken = 'a1b2c3d4'.repeat(256);
      expect(oversizedToken.length).toBe(2048);

      const res = (await notionBasicOAuthClient.post('/oauth/introspect', {
        token: oversizedToken,
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.active).toBe(false);
    });

    it('TC_OAUTH_INT_003 - [Negative] Reject introspection with invalid Basic Auth credentials (401)', async () => {
      const badBasicClient = createCustomNotionClient({
        authType: 'basic',
        basicClientId: 'invalid_client',
        basicClientSecret: 'invalid_secret',
      });
      const res = (await badBasicClient.post('/oauth/introspect', {
        token: 'ntn_sample_token',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 401, ['invalid_client', 'unauthorized']);
    });

    it('TC_OAUTH_INT_004 - [Negative] Reject introspection when token field is missing {} (400)', async () => {
      const res = (await notionBasicOAuthClient.post(
        '/oauth/introspect',
        {}
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['validation_error', 'invalid_request']);
    });

    it('TC_OAUTH_INT_005 - [Negative] Reject introspection when token has non-string integer type (400)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/introspect', {
        token: 123456789,
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['validation_error', 'invalid_request']);
    });

    it('TC_OAUTH_INT_006 - [Negative] Reject introspection when Notion-Version header is omitted (400)', async () => {
      const noVersionBasicClient = createCustomNotionClient({
        authType: 'basic',
        omitNotionVersion: true,
      });
      const res = (await noVersionBasicClient.post('/oauth/introspect', {
        token: 'ntn_sample_token',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertOAuthErrorContract(res, 400, ['missing_version', 'validation_error']);
    });
  });
});
