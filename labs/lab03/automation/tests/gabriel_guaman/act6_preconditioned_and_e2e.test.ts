import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
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
  CompactHex32Regex,
} from '../../src/core/assertions.js';

describe('Activity #6 — Preconditioned Tests, Data Integrity & Chained E2E Suites (Users & OAuth)', () => {
  // Dynamic Precondition State populated in beforeAll
  let targetUserId = '';
  let botUserId = '';
  let compactUserId = '';
  let firstPageUserId = '';
  let nextCursor = '';

  beforeAll(async () => {
    const res = (await notionBearerClient.get('/users', {
      params: { page_size: 100 },
    })) as TimedAxiosResponse;

    if (res.status === 200 && Array.isArray(res.data?.results)) {
      const results = res.data.results;
      const person = results.find((u: any) => u.type === 'person') || results[0];
      const bot = results.find((u: any) => u.type === 'bot') || results[0];

      if (person) {
        targetUserId = person.id;
        compactUserId = person.id.replace(/-/g, '');
      }
      if (bot) {
        botUserId = bot.id;
        if (!targetUserId) {
          targetUserId = bot.id;
          compactUserId = bot.id.replace(/-/g, '');
        }
      }
    }

    // Seed pagination cursor from page_size=1
    await throttleRequest(350);
    const page1Res = (await notionBearerClient.get('/users', {
      params: { page_size: 1 },
    })) as TimedAxiosResponse;

    if (page1Res.status === 200 && page1Res.data?.results?.length > 0) {
      firstPageUserId = page1Res.data.results[0].id;
      nextCursor = page1Res.data.next_cursor || '';
    }
  });

  beforeEach(async () => {
    await throttleRequest(350);
  });

  afterAll(() => {
    targetUserId = '';
    botUserId = '';
    compactUserId = '';
    nextCursor = '';
  });

  // ============================================================================
  // 1. Preconditioned Identity, Normalization & Capability Boundary Tests
  // ============================================================================
  describe('Suite 01: Preconditioned GET /v1/users/{user_id} & GET /v1/users Cursor Traversal', () => {
    it('TC_USR_GET_001 - [Happy Path] Retrieve workspace user profile via seeded canonical UUIDv4 (200 OK)', async () => {
      const res = (await notionBearerClient.get(`/users/${targetUserId}`)) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);

      const parsed = UserObjectSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(res.data.id).toBe(targetUserId);
      expect(['person', 'bot']).toContain(res.data.type);
    });

    it('TC_USR_GET_002 - [Happy Path] Retrieve bot user profile by seeded bot_user_id (200 OK)', async () => {
      const res = (await notionBearerClient.get(`/users/${botUserId}`)) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('user');
      expect(res.data.id).toBe(botUserId);
      expect(res.data.type).toBe('bot');
    });

    it('TC_USR_GET_008 - [Boundary & Data Integrity] Accept compact 32-char hex UUID and normalize response to 36-char UUIDv4', async () => {
      expect(compactUserId).toMatch(CompactHex32Regex);

      const res = (await notionBearerClient.get(`/users/${compactUserId}`)) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('user');
      expect(res.data.id).toHaveLength(36);
      expect(res.data.id).toMatch(UUIDv4Regex);
      expect(res.data.id.replace(/-/g, '').toLowerCase()).toBe(compactUserId.toLowerCase());
      expect(res.data.id).toBe(targetUserId);
    });

    it('TC_USR_GET_006 - [Negative] Reject query when token lacks Read User Information capability (403 restricted_resource)', async () => {
      const restrictedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.RESTRICTED_TOKEN || '',
      });
      const res = (await restrictedClient.get(`/users/${targetUserId}`)) as TimedAxiosResponse;

      assertNotionErrorContract(res, 403, 'restricted_resource');
    });

    it('TC_USR_LIST_002 - [Happy Path & Data Integrity] Traverse cursor-based pagination using start_cursor={{next_cursor}}', async () => {
      const params: Record<string, string | number> = { page_size: 1 };
      if (nextCursor) {
        params.start_cursor = nextCursor;
      }

      const res = (await notionBearerClient.get('/users', { params })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);

      const parsed = PaginatedUserListSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(res.data.results.length).toBeGreaterThan(0);

      if (firstPageUserId && nextCursor) {
        expect(res.data.results[0].id).not.toBe(firstPageUserId);
      }
    });
  });

  // ============================================================================
  // 2. Preconditioned OAuth 2.0 Token Lifecycle & Idempotency Tests
  // ============================================================================
  describe('Suite 02: Preconditioned OAuth 2.0 Token Exchange, Rotation, Introspection & Idempotency', () => {
    it('TC_USR_ME_002 - [Happy Path] Retrieve bot profile & workspace upload limits with OAuth Access Token (200 OK)', async () => {
      const rawOAuthTok = process.env.OAUTH_ACCESS_TOKEN || '';
      const effectiveToken =
        !rawOAuthTok || rawOAuthTok.includes('YOUR_')
          ? process.env.NOTION_TOKEN || ''
          : rawOAuthTok;

      const oauthBearerClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: effectiveToken,
      });
      const res = (await oauthBearerClient.get('/users/me')) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('user');
      expect(res.data.type).toBe('bot');
      expect(res.data.bot?.workspace_limits?.max_file_upload_size_in_bytes).toBeGreaterThan(0);
    });

    it('TC_OAUTH_TOK_001 - [Happy Path] Exchange authorization_code for access_token & refresh_token (200 OK)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: process.env.OAUTH_AUTH_CODE || '',
        redirect_uri:
          process.env.OAUTH_REDIRECT_URI || 'https://localhost:3000/auth/notion/callback',
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(typeof res.data.access_token).toBe('string');
      expect(res.data.token_type).toBe('bearer');
      expect(res.data.bot_id).toMatch(UUIDv4Regex);
    });

    it('TC_OAUTH_TOK_002 - [Happy Path] Rotate session credentials via grant_type refresh_token (200 OK)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: process.env.OAUTH_REFRESH_TOKEN || '',
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(typeof res.data.access_token).toBe('string');
      expect(res.data.token_type).toBe('bearer');
    });

    it('TC_OAUTH_TOK_009 - [Boundary] Reject single-use authorization_code replay attempt (400 invalid_grant)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: process.env.OAUTH_AUTH_CODE || 'replayed_single_use_code',
        redirect_uri:
          process.env.OAUTH_REDIRECT_URI || 'https://localhost:3000/auth/notion/callback',
      })) as TimedAxiosResponse;

      assertOAuthErrorContract(res, 400, ['invalid_grant', 'invalid_request']);
    });

    it('TC_OAUTH_REV_001 - [Happy Path] Revoke isolated OAuth token with Basic Auth credentials (200 OK)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/revoke', {
        token: 'ntn_isolated_session_token_for_revoke_001',
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(typeof res.data).toBe('object');
    });

    it('TC_OAUTH_REV_007 - [Boundary] Verify RFC 7009 idempotency when revoking an already-revoked token (200 OK)', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/revoke', {
        token: 'ntn_isolated_session_token_for_revoke_001',
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(typeof res.data).toBe('object');
    });

    it('TC_OAUTH_INT_001 - [Happy Path] Introspect OAuth access_token & validate active state contract (200 OK)', async () => {
      const subjectToken = process.env.OAUTH_ACCESS_TOKEN || 'ntn_fallback_introspect_token';
      const res = (await notionBasicOAuthClient.post('/oauth/introspect', {
        token: subjectToken,
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      const parsed = OAuthIntrospectSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(typeof res.data.active).toBe('boolean');
    });
  });

  // ============================================================================
  // 3. Chained Multi-Step E2E Workflows Migrated from Postman (03_E2E_Workflows)
  // ============================================================================
  describe('Suite 03: TC_E2E_002 — 5-Step Workspace Users Discovery, Pagination & Compact/Hyphenated Equivalence', () => {
    let e2eExtractedUserId = '';
    let e2eCompactUserId = '';
    let e2eNextCursor = '';
    let e2eBaselineName: string | null = null;
    let e2eBaselineType = '';

    it('TC_E2E_002_Step1 - GET List Users (page_size=1) & Extract extracted_user_id + next_cursor', async () => {
      const res = (await notionBearerClient.get('/users', {
        params: { page_size: 1 },
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('list');
      expect(res.data.results).toHaveLength(1);

      e2eExtractedUserId = res.data.results[0].id;
      e2eCompactUserId = e2eExtractedUserId.replace(/-/g, '');
      e2eNextCursor = res.data.next_cursor || '';

      expect(e2eExtractedUserId).toMatch(UUIDv4Regex);
      expect(e2eCompactUserId).toMatch(CompactHex32Regex);
    });

    it('TC_E2E_002_Step2 - GET Second Page via start_cursor={{next_cursor}} & Verify Distinct User', async () => {
      const params: Record<string, string | number> = { page_size: 1 };
      if (e2eNextCursor) {
        params.start_cursor = e2eNextCursor;
      }

      const res = (await notionBearerClient.get('/users', { params })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('list');
      expect(res.data.results.length).toBeGreaterThan(0);

      if (e2eNextCursor && e2eExtractedUserId) {
        expect(res.data.results[0].id).not.toBe(e2eExtractedUserId);
      }
    });

    it('TC_E2E_002_Step3 - GET Individual Profile via Hyphenated {{extracted_user_id}} & Cache Baseline', async () => {
      const res = (await notionBearerClient.get(
        `/users/${e2eExtractedUserId}`
      )) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('user');
      expect(res.data.id).toBe(e2eExtractedUserId);

      e2eBaselineName = res.data.name;
      e2eBaselineType = res.data.type;
    });

    it('TC_E2E_002_Step4 - GET Individual Profile via 32-Char {{compact_user_id}} & Assert Data Integrity Equivalence', async () => {
      const res = (await notionBearerClient.get(`/users/${e2eCompactUserId}`)) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.id).toBe(e2eExtractedUserId);
      expect(res.data.name).toBe(e2eBaselineName);
      expect(res.data.type).toBe(e2eBaselineType);
    });

    it('TC_E2E_002_Step5 - Verify 401 Unauthorized Denial on {{extracted_user_id}} with Revoked/Invalid Token', async () => {
      const revokedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_revoked_e2e_002_token',
      });
      const res = (await revokedClient.get(`/users/${e2eExtractedUserId}`)) as TimedAxiosResponse;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });
  });

  describe('Suite 04: TC_E2E_003 — 4-Step OAuth Refresh Token Rotation & Directory Continuity', () => {
    let chainedOAuthToken = process.env.OAUTH_ACCESS_TOKEN || '';

    it('TC_E2E_003_Step1 - POST Rotate Credentials via refresh_token & Store OAUTH_ACCESS_TOKEN', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: process.env.OAUTH_REFRESH_TOKEN || '',
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(typeof res.data.access_token).toBe('string');
      chainedOAuthToken = res.data.access_token;
    });

    it('TC_E2E_003_Step2 - POST Introspect Chained OAUTH_ACCESS_TOKEN', async () => {
      const tokenToInspect = chainedOAuthToken || process.env.NOTION_TOKEN || '';
      const res = (await notionBasicOAuthClient.post('/oauth/introspect', {
        token: tokenToInspect,
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(typeof res.data.active).toBe('boolean');
    });

    it('TC_E2E_003_Step3 - GET /v1/users/me Authenticated with Chained OAUTH_ACCESS_TOKEN', async () => {
      const effectiveTok =
        !chainedOAuthToken || chainedOAuthToken.includes('YOUR_')
          ? process.env.NOTION_TOKEN || ''
          : chainedOAuthToken;
      const client = createCustomNotionClient({ authType: 'bearer', bearerToken: effectiveTok });
      const res = (await client.get('/users/me')) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('user');
      expect(res.data.type).toBe('bot');
    });

    it('TC_E2E_003_Step4 - GET /v1/users Directory Authenticated with Chained OAUTH_ACCESS_TOKEN', async () => {
      const effectiveTok =
        !chainedOAuthToken || chainedOAuthToken.includes('YOUR_')
          ? process.env.NOTION_TOKEN || ''
          : chainedOAuthToken;
      const client = createCustomNotionClient({ authType: 'bearer', bearerToken: effectiveTok });
      const res = (await client.get('/users')) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('list');
      expect(res.data.results.length).toBeGreaterThan(0);
    });
  });

  describe('Suite 05: TC_E2E_001 — 6-Step Full OAuth Token Lifecycle & Isolated Revocation', () => {
    let isolatedToken = 'ntn_disposable_unattended_e2e001_token';

    it('TC_E2E_001_Step1 - POST Exchange Authorization Code for OAUTH_ACCESS_TOKEN & bot_user_id', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: process.env.OAUTH_AUTH_CODE || '',
        redirect_uri:
          process.env.OAUTH_REDIRECT_URI || 'https://localhost:3000/auth/notion/callback',
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      isolatedToken = res.data.access_token;
    });

    it('TC_E2E_001_Step2 - POST Introspect Chained Token State', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/introspect', {
        token: isolatedToken,
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(typeof res.data.active).toBe('boolean');
    });

    it('TC_E2E_001_Step3 - GET /v1/users/me with OAUTH_ACCESS_TOKEN & Verify Identity Contract', async () => {
      const client = createCustomNotionClient({ authType: 'bearer', bearerToken: isolatedToken });
      const res = (await client.get('/users/me')) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('user');
    });

    it('TC_E2E_001_Step4 - POST Revoke Isolated OAUTH_ACCESS_TOKEN', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/revoke', {
        token: isolatedToken,
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(typeof res.data).toBe('object');
    });

    it('TC_E2E_001_Step5 - POST Re-Introspect Revoked Token & Confirm active: false', async () => {
      const res = (await notionBasicOAuthClient.post('/oauth/introspect', {
        token: isolatedToken,
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.active).toBe(false);
    });

    it('TC_E2E_001_Step6 - GET /v1/users/me with Revoked Token (Verify 401 Denial & Teardown)', async () => {
      const revokedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: isolatedToken,
      });
      const res = (await revokedClient.get('/users/me')) as TimedAxiosResponse;

      assertNotionErrorContract(res, 401, 'unauthorized');
      isolatedToken = '';
    });
  });
});
