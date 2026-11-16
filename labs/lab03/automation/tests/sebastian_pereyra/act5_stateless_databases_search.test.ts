import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import {
  notionBearerClient,
  createCustomNotionClient,
  throttleRequest,
  TimedAxiosResponse,
} from '../../src/core/notionClient.js';
import {
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
  assertDatabaseObjectContract,
  assertSearchListContract,
  PaginatedSearchListSchema,
  UUIDv4Regex,
} from '../../src/core/assertions.js';

describe('Activity #5 — Stateless API Tests Without Preconditions (Databases & Search Modules)', () => {
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
  // 1. POST /v1/search (Stateless Discovery & Query Suite)
  // ============================================================================
  describe('Suite 01: POST /v1/search — Stateless Discovery, Filtering & Pagination Boundaries', () => {
    it('TC_SEARCH_002 - [Happy Path] Global workspace discovery with empty body (200 OK)', async () => {
      const res = (await notionBearerClient.post('/search', {})) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      assertSearchListContract(res, 200);

      expect(res.data.object).toBe('list');
      expect(Array.isArray(res.data.results)).toBe(true);
      expect(typeof res.data.has_more).toBe('boolean');
    });

    it('TC_SEARCH_003 - [Happy Path] Filter search results strictly by data_source container type (200 OK)', async () => {
      const res = (await notionBearerClient.post('/search', {
        filter: { value: 'data_source', property: 'object' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      assertSearchListContract(res, 200);

      if (res.data.results.length > 0) {
        for (const item of res.data.results) {
          expect(item.object).toBe('data_source');
          expect(item.id).toMatch(UUIDv4Regex);
        }
      }
    });

    it('TC_SEARCH_004 - [Happy Path] Filter search results strictly by page type (200 OK)', async () => {
      const res = (await notionBearerClient.post('/search', {
        filter: { value: 'page', property: 'object' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      assertSearchListContract(res, 200);

      if (res.data.results.length > 0) {
        for (const item of res.data.results) {
          expect(item.object).toBe('page');
          expect(item.id).toMatch(UUIDv4Regex);
        }
      }
    });

    it('TC_SEARCH_005 - [Happy Path] Sort search results descending by last_edited_time (200 OK)', async () => {
      const res = (await notionBearerClient.post('/search', {
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      assertSearchListContract(res, 200);

      if (res.data.results.length >= 2) {
        const time0 = new Date(res.data.results[0].last_edited_time).getTime();
        const time1 = new Date(res.data.results[1].last_edited_time).getTime();
        expect(time0).toBeGreaterThanOrEqual(time1);
      }
    });

    it('TC_SEARCH_006 - [Happy Path] Sort search results ascending by last_edited_time (200 OK)', async () => {
      const res = (await notionBearerClient.post('/search', {
        sort: { direction: 'ascending', timestamp: 'last_edited_time' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      assertSearchListContract(res, 200);

      if (res.data.results.length >= 2) {
        const time0 = new Date(res.data.results[0].last_edited_time).getTime();
        const time1 = new Date(res.data.results[1].last_edited_time).getTime();
        expect(time0).toBeLessThanOrEqual(time1);
      }
    });

    it('TC_SEARCH_017 - [Boundary] Minimum page_size=1 boundary returns at most 1 item (200 OK)', async () => {
      const res = (await notionBearerClient.post('/search', {
        page_size: 1,
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      assertSearchListContract(res, 200);
      expect(res.data.results.length).toBeLessThanOrEqual(1);
    });

    it('TC_SEARCH_018 - [Boundary] Maximum page_size=100 boundary returns up to 100 items (200 OK)', async () => {
      const res = (await notionBearerClient.post('/search', {
        page_size: 100,
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      assertSearchListContract(res, 200);
      expect(res.data.results.length).toBeLessThanOrEqual(100);
    });

    it('TC_SEARCH_021 - [Boundary] Query with nonexistent title returns empty list (200 OK)', async () => {
      const res = (await notionBearerClient.post('/search', {
        query: 'zzz_nonexistent_database_query_key_99999_xyz',
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      assertSearchListContract(res, 200);
      expect(res.data.results).toEqual([]);
      expect(res.data.has_more).toBe(false);
    });

    it('TC_SEARCH_022 - [Boundary] Query containing Unicode and emoji executes cleanly (200 OK)', async () => {
      const res = (await notionBearerClient.post('/search', {
        query: '日本語テスト 📊 <SQL injection test>',
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      assertSearchListContract(res, 200);
      expect(Array.isArray(res.data.results)).toBe(true);
    });

    it('TC_SEARCH_009 - [Negative] Reject search request without Authorization header (401 Unauthorized)', async () => {
      const unauthClient = createCustomNotionClient({
        authType: 'none',
      });
      const res = (await unauthClient.post('/search', {})) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_SEARCH_010 - [Negative] Reject search request with forged Bearer token (401 Unauthorized)', async () => {
      const forgedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_forged_invalid_token_database_search',
      });
      const res = (await forgedClient.post('/search', {})) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_SEARCH_011 - [Negative] Reject search request without Notion-Version header (400 Bad Request)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || 'ntn_test',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.post('/search', {})) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });

    it('TC_SEARCH_012 - [Negative] Reject malformed JSON body with invalid_json (400 Bad Request)', async () => {
      const rawClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || 'ntn_test',
      });
      const res = (await rawClient.post('/search', '{', {
        headers: { 'Content-Type': 'application/json' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'invalid_json');
    });

    it('TC_SEARCH_013 - [Negative] Reject invalid filter object value (400 validation_error)', async () => {
      const res = (await notionBearerClient.post('/search', {
        filter: { value: 'user', property: 'object' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_SEARCH_014 - [Negative] Reject invalid sort timestamp created_time (400 validation_error)', async () => {
      const res = (await notionBearerClient.post('/search', {
        sort: { direction: 'descending', timestamp: 'created_time' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_SEARCH_015 - [Negative] Reject malformed start_cursor string (400 validation_error)', async () => {
      const res = (await notionBearerClient.post('/search', {
        start_cursor: 'malformed_invalid_cursor_token',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_SEARCH_019 - [Boundary] Handle boundary page_size=0 gracefully (200 OK)', async () => {
      const res = (await notionBearerClient.post('/search', {
        page_size: 0,
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      assertSearchListContract(res, 200);
    });

    it('TC_SEARCH_020 - [Boundary] Reject malformed page_size type (400 validation_error)', async () => {
      const res = (await notionBearerClient.post('/search', {
        page_size: 'exceeded_non_integer',
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });
  });

  // ============================================================================
  // 2. GET /v1/databases/{database_id} (Stateless Suite)
  // ============================================================================
  describe('Suite 02: GET /v1/databases/{database_id} — Stateless Retrieval & Error Contracts', () => {
    it('TC_DB_GET_004 - [Negative] Reject database retrieval without Authorization header (401)', async () => {
      const unauthClient = createCustomNotionClient({
        authType: 'none',
      });
      const res = (await unauthClient.get('/databases/00000000-0000-0000-0000-000000000000')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_DB_GET_005 - [Negative] Reject database retrieval with forged Bearer token (401)', async () => {
      const forgedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_invalid_forged_bearer_token_db_get',
      });
      const res = (await forgedClient.get('/databases/00000000-0000-0000-0000-000000000000')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_DB_GET_006 - [Negative] Reject database retrieval without Notion-Version header (400)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || 'ntn_test',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.get('/databases/00000000-0000-0000-0000-000000000000')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });

    it('TC_DB_GET_007 - [Negative] Reject non-UUID string in path parameter (400 validation_error)', async () => {
      const res = (await notionBearerClient.get('/databases/invalid-database-uuid-format')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_DB_GET_008 - [Negative] Return 404 Not Found for nonexistent database nil UUID', async () => {
      const res = (await notionBearerClient.get(
        '/databases/00000000-0000-0000-0000-000000000000'
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_DB_GET_009 - [Negative] Return 404 Not Found for unshared database UUID (access control isolation)', async () => {
      const res = (await notionBearerClient.get(
        '/databases/ffffffff-ffff-4fff-bfff-ffffffffffff'
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_DB_GET_013 - [Boundary] Trailing slash with missing ID returns 404 or 400 cleanly', async () => {
      const res = (await notionBearerClient.get('/databases/')) as TimedAxiosResponse;
      lastResponse = res;

      expect([400, 404]).toContain(res.status);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('error');
    });
  });

  // ============================================================================
  // 3. POST /v1/databases (Stateless Negative & Boundary Suite)
  // ============================================================================
  describe('Suite 03: POST /v1/databases — Stateless Schema & Input Boundaries', () => {
    it('TC_DB_007 - [Negative] Reject database creation without Authorization header (401)', async () => {
      const unauthClient = createCustomNotionClient({
        authType: 'none',
      });
      const res = (await unauthClient.post('/databases', {
        parent: { page_id: '00000000-0000-0000-0000-000000000000' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_DB_008 - [Negative] Reject database creation with forged Bearer token (401)', async () => {
      const forgedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_forged_database_creation_token',
      });
      const res = (await forgedClient.post('/databases', {
        parent: { page_id: '00000000-0000-0000-0000-000000000000' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_DB_009 - [Negative] Reject database creation with non-Bearer authentication scheme (401)', async () => {
      const basicClient = createCustomNotionClient({
        authType: 'basic',
        basicClientId: 'invalid_client_id',
        basicClientSecret: 'invalid_client_secret',
      });
      const res = (await basicClient.post('/databases', {
        parent: { page_id: '00000000-0000-0000-0000-000000000000' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_DB_010 - [Negative] Reject database creation without Notion-Version header (400)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || 'ntn_test',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.post('/databases', {
        parent: { page_id: '00000000-0000-0000-0000-000000000000' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });

    it('TC_DB_011 - [Negative] Reject malformed JSON body with invalid_json (400 Bad Request)', async () => {
      const rawClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || 'ntn_test',
      });
      const res = (await rawClient.post('/databases', '{', {
        headers: { 'Content-Type': 'application/json' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'invalid_json');
    });

    it('TC_DB_012 - [Negative] Reject database creation when parent field is missing (400 validation_error)', async () => {
      const res = (await notionBearerClient.post('/databases', {
        title: [{ text: { content: 'No Parent DB' } }],
        properties: { Name: { title: {} } },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_DB_013 - [Negative] Reject invalid UUID format in parent.page_id (400 validation_error)', async () => {
      const res = (await notionBearerClient.post('/databases', {
        parent: { page_id: 'not-a-valid-uuid-123' },
        properties: { Name: { title: {} } },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_DB_014 - [Negative] Return 404 Not Found when parent page does not exist', async () => {
      const res = (await notionBearerClient.post('/databases', {
        parent: { type: 'page_id', page_id: '00000000-0000-0000-0000-000000000000' },
        properties: { Name: { title: {} } },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_DB_022 - [Boundary] Reject empty string parent.page_id with 400 validation_error', async () => {
      const res = (await notionBearerClient.post('/databases', {
        parent: { page_id: '' },
        properties: { Name: { title: {} } },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });
  });

  // ============================================================================
  // 4. PATCH /v1/databases/{database_id} (Stateless Negative Suite)
  // ============================================================================
  describe('Suite 04: PATCH /v1/databases/{database_id} — Stateless Negative & Boundary Validations', () => {
    it('TC_DB_PATCH_007 - [Negative] Reject database update without Authorization header (401)', async () => {
      const unauthClient = createCustomNotionClient({
        authType: 'none',
      });
      const res = (await unauthClient.patch('/databases/00000000-0000-0000-0000-000000000000', {
        title: [{ text: { content: 'Unauthorized Patch' } }],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_DB_PATCH_008 - [Negative] Reject database update with forged Bearer token (401)', async () => {
      const forgedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_invalid_forged_patch_token',
      });
      const res = (await forgedClient.patch('/databases/00000000-0000-0000-0000-000000000000', {
        title: [{ text: { content: 'Forged Patch' } }],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_DB_PATCH_009 - [Negative] Reject database update without Notion-Version header (400)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || 'ntn_test',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.patch('/databases/00000000-0000-0000-0000-000000000000', {
        title: [{ text: { content: 'No Version Patch' } }],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });

    it('TC_DB_PATCH_010 - [Negative] Reject invalid UUID format in path parameter (400 validation_error)', async () => {
      const res = (await notionBearerClient.patch('/databases/invalid-patch-uuid', {
        title: [{ text: { content: 'Invalid UUID Path' } }],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_DB_PATCH_011 - [Negative] Return 404 Not Found for nonexistent database nil UUID', async () => {
      const res = (await notionBearerClient.patch(
        '/databases/00000000-0000-0000-0000-000000000000',
        {
          title: [{ text: { content: 'Nonexistent Patch' } }],
        }
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_DB_PATCH_013 - [Negative] Reject malformed JSON body with invalid_json (400 Bad Request)', async () => {
      const rawClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || 'ntn_test',
      });
      const res = (await rawClient.patch('/databases/00000000-0000-0000-0000-000000000000', '{', {
        headers: { 'Content-Type': 'application/json' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'invalid_json');
    });
  });
});

