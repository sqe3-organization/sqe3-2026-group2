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
  BlockObjectSchema,
  PaginatedBlockListSchema,
  NotionErrorSchema,
  UUIDv4Regex,
  CompactHex32Regex,
} from '../../src/core/assertions.js';

const UNASSIGNED_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const HEX_31_CHAR = 'f47ac10b58cc4372a5670e02b2c3d47';
const HEX_33_CHAR = 'f47ac10b58cc4372a5670e02b2c3d4799';

describe('Activity #5 — Stateless API Tests Without Preconditions (Blocks Module — Karen Cruz)', () => {
  const telemetryLog: Array<{ testName: string; status: number; durationMs: number }> = [];
  let lastResponse: TimedAxiosResponse | null = null;
  let rootBlockId = (process.env.PARENT_PAGE_ID || process.env.PAGE_ID || '').trim();
  let compactRootBlockId = '';

  // Lifecycle Hook 1: beforeAll — Validate NOTION_TOKEN & resolve root page/block ID (with POST /v1/search fallback)
  beforeAll(async () => {
    expect(process.env.NOTION_BASE_URL || 'https://api.notion.com/v1').toContain('api.notion.com');
    expect(Boolean(process.env.NOTION_TOKEN)).toBe(true);

    if (!rootBlockId || rootBlockId === 'YOUR_SHARED_PARENT_PAGE_UUID') {
      const searchRes = (await notionBearerClient.post('/search', {
        filter: { value: 'page', property: 'object' },
        page_size: 1,
      })) as TimedAxiosResponse;
      expect(searchRes.status).toBe(200);
      expect(searchRes.data.results?.length).toBeGreaterThan(0);
      rootBlockId = searchRes.data.results[0].id;
    }

    compactRootBlockId = rootBlockId.replace(/-/g, '');
    expect(rootBlockId).toMatch(UUIDv4Regex);
    expect(compactRootBlockId).toMatch(CompactHex32Regex);
  });

  // Lifecycle Hook 2: beforeEach — Enforce Notion API 350 ms rate-limit guard & reset per-test telemetry
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

  // Lifecycle Hook 4: afterAll — Clear suite telemetry buffer
  afterAll(() => {
    telemetryLog.length = 0;
  });

  // ============================================================================
  // Suite 01 — GET /v1/blocks/{block_id} (Stateless Retrieval, Boundary & Negative Suite)
  // ============================================================================
  describe('Suite 01: GET /v1/blocks/{block_id} — Stateless Retrieval, Boundary & Negative Contract Suite', () => {
    it('TC_BLK_GET_011 - [Happy Path & Boundary] Retrieve root page metadata addressable as a block (200 OK)', async () => {
      const res = (await notionBearerClient.get(`/blocks/${rootBlockId}`)) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);

      const parsed = BlockObjectSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(res.data.object).toBe('block');
      expect(res.data.id).toBe(rootBlockId);
      expect(res.data.type).toBe('child_page');
      expect(typeof res.data.has_children).toBe('boolean');
      expect(res.data.in_trash).toBe(false);
    });

    it('TC_BLK_GET_009 - [Boundary] Accept compact 32-char hex block UUID and normalize response to 36-char UUIDv4 (200 OK)', async () => {
      expect(compactRootBlockId).toMatch(CompactHex32Regex);

      const res = (await notionBearerClient.get(
        `/blocks/${compactRootBlockId}`
      )) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);

      const parsed = BlockObjectSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(res.data.id).toMatch(UUIDv4Regex);
      expect(res.data.id).toBe(rootBlockId);
      expect(res.data.id.replace(/-/g, '').toLowerCase()).toBe(compactRootBlockId.toLowerCase());
    });

    it('TC_BLK_GET_008 - [Negative] Reject syntactically invalid non-UUID block_id (400 validation_error)', async () => {
      const res = (await notionBearerClient.get('/blocks/not-a-valid-uuid')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_GET_010b - [Boundary] Reject off-by-one 31-character hex block_id (400 validation_error)', async () => {
      const res = (await notionBearerClient.get(`/blocks/${HEX_31_CHAR}`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_GET_010c - [Boundary] Reject off-by-one 33-character hex block_id (400 validation_error)', async () => {
      const res = (await notionBearerClient.get(`/blocks/${HEX_33_CHAR}`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_GET_007 - [Negative] Return 404 Not Found for unassigned well-formed UUIDv4 (object_not_found)', async () => {
      const res = (await notionBearerClient.get(
        `/blocks/${UNASSIGNED_UUID}`
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_BLK_GET_010a - [Boundary] Return 404 Not Found for all-zero nil UUID (00000000-0000-0000-0000-000000000000)', async () => {
      const res = (await notionBearerClient.get(`/blocks/${NIL_UUID}`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_BLK_GET_004b - [Negative] Reject request when Authorization header is omitted (401 unauthorized)', async () => {
      const unauthClient = createCustomNotionClient({ authType: 'none' });
      const res = (await unauthClient.get(`/blocks/${rootBlockId}`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_BLK_GET_004a - [Negative] Reject request with invalid or forged Bearer token (401 unauthorized)', async () => {
      const forgedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_forged_invalid_blocks_token_004',
      });
      const res = (await forgedClient.get(`/blocks/${rootBlockId}`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_BLK_GET_005a - [Negative] Reject request when Notion-Version header is omitted (400 missing_version)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || '',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.get(`/blocks/${rootBlockId}`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });

    it('TC_BLK_GET_005b - [Negative] Reject request when Notion-Version header is unsupported (2099-01-01 -> 400)', async () => {
      const badVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || '',
        notionVersion: '2099-01-01',
      });
      const res = (await badVersionClient.get(`/blocks/${rootBlockId}`)) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(400);
      assertCommonHeadersAndSla(res);
      expect(NotionErrorSchema.safeParse(res.data).success).toBe(true);
      expect(['validation_error', 'missing_version']).toContain(res.data.code);
    });
  });

  // ============================================================================
  // Suite 02 — GET /v1/blocks/{block_id}/children (Stateless Pagination Boundary & Negative Suite)
  // ============================================================================
  describe('Suite 02: GET /v1/blocks/{block_id}/children — Stateless Pagination Boundary & Negative Suite', () => {
    it('TC_BLK_CHL_001 - [Happy Path] Retrieve children list on PARENT_PAGE_ID with default pagination (200 OK)', async () => {
      const res = (await notionBearerClient.get(
        `/blocks/${rootBlockId}/children`
      )) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);

      const parsed = PaginatedBlockListSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(res.data.object).toBe('list');
      expect(res.data.type).toBe('block');
      expect(Array.isArray(res.data.results)).toBe(true);
      expect(typeof res.data.has_more).toBe('boolean');
    });

    it('TC_BLK_CHL_011a - [Boundary] Verify minimum pagination boundary page_size=1 (200 OK, results.length <= 1)', async () => {
      const res = (await notionBearerClient.get(`/blocks/${rootBlockId}/children`, {
        params: { page_size: 1 },
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);

      const parsed = PaginatedBlockListSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(res.data.results.length).toBeLessThanOrEqual(1);
    });

    it('TC_BLK_CHL_011b - [Boundary] Verify maximum pagination boundary page_size=100 (200 OK, results.length <= 100)', async () => {
      const res = (await notionBearerClient.get(`/blocks/${rootBlockId}/children`, {
        params: { page_size: 100 },
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);

      const parsed = PaginatedBlockListSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(res.data.results.length).toBeLessThanOrEqual(100);
    });

    it('TC_BLK_CHL_012a - [Boundary] Reject out-of-bounds page_size=0 below minimum limit (400 validation_error)', async () => {
      const res = (await notionBearerClient.get(`/blocks/${rootBlockId}/children`, {
        params: { page_size: 0 },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_CHL_012b - [Boundary] Reject out-of-bounds page_size=101 above maximum limit (400 validation_error)', async () => {
      const res = (await notionBearerClient.get(`/blocks/${rootBlockId}/children`, {
        params: { page_size: 101 },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_CHL_010 - [Negative] Reject non-numeric page_size=abc query parameter (400 validation_error)', async () => {
      const res = (await notionBearerClient.get(`/blocks/${rootBlockId}/children`, {
        params: { page_size: 'abc' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_CHL_009 - [Negative] Reject malformed start_cursor=invalid_cursor parameter (400 validation_error)', async () => {
      const res = (await notionBearerClient.get(`/blocks/${rootBlockId}/children`, {
        params: { start_cursor: 'invalid_cursor' },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_CHL_005b - [Negative] Reject children listing without Authorization header (401 unauthorized)', async () => {
      const unauthClient = createCustomNotionClient({ authType: 'none' });
      const res = (await unauthClient.get(`/blocks/${rootBlockId}/children`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_BLK_CHL_005a - [Negative] Reject children listing with invalid Bearer token (401 unauthorized)', async () => {
      const forgedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_forged_children_token_005',
      });
      const res = (await forgedClient.get(`/blocks/${rootBlockId}/children`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_BLK_CHL_006 - [Negative] Reject children listing when Notion-Version header is omitted (400 missing_version)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || '',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.get(
        `/blocks/${rootBlockId}/children`
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });

    it('TC_BLK_CHL_008 - [Negative] Reject children listing for syntactically invalid UUID (400 validation_error)', async () => {
      const res = (await notionBearerClient.get(
        '/blocks/not-a-valid-uuid/children'
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_CHL_007b - [Negative] Return 404 Not Found when listing children of non-existent block UUID', async () => {
      const res = (await notionBearerClient.get(
        `/blocks/${UNASSIGNED_UUID}/children`
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_BLK_CHL_014a - [Boundary] Return 404 Not Found when listing children of all-zero nil UUID', async () => {
      const res = (await notionBearerClient.get(
        `/blocks/${NIL_UUID}/children`
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });
  });

  // ============================================================================
  // Suite 03 — PATCH /v1/blocks/{block_id}/children (Stateless Payload Validation & Negative Suite)
  // ============================================================================
  describe('Suite 03: PATCH /v1/blocks/{block_id}/children — Stateless Payload Validation & Negative Suite', () => {
    it('TC_BLK_APP_010a - [Negative] Reject empty payload {} missing required children array (400 validation_error)', async () => {
      const res = (await notionBearerClient.patch(
        `/blocks/${rootBlockId}/children`,
        {}
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_APP_015 - [Boundary] Reject empty children: [] array boundary with 400 validation_error (never 500)', async () => {
      const res = (await notionBearerClient.patch(`/blocks/${rootBlockId}/children`, {
        children: [],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_APP_010b - [Negative] Reject unsupported block type in children payload (400 validation_error)', async () => {
      const res = (await notionBearerClient.patch(`/blocks/${rootBlockId}/children`, {
        children: [
          {
            object: 'block',
            type: 'unsupported_custom_block',
            unsupported_custom_block: { rich_text: [] },
          },
        ],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_APP_010c - [Negative] Reject block type/payload property mismatch (400 validation_error)', async () => {
      const res = (await notionBearerClient.patch(`/blocks/${rootBlockId}/children`, {
        children: [
          {
            object: 'block',
            type: 'heading_1',
            paragraph: { rich_text: [{ type: 'text', text: { content: 'Mismatch' } }] },
          },
        ],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_APP_014b - [Boundary] Reject paragraph rich_text content exceeding 2000-char limit (2001 chars -> 400)', async () => {
      const oversizedContent = 'a'.repeat(2001);
      expect(oversizedContent.length).toBe(2001);

      const res = (await notionBearerClient.patch(`/blocks/${rootBlockId}/children`, {
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: oversizedContent } }] },
          },
        ],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_APP_013b - [Boundary] Reject children array exceeding 100-block batch limit (101 blocks -> 400)', async () => {
      const tooManyBlocks = Array.from({ length: 101 }, (_, i) => ({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: `Item ${i + 1}` } }] },
      }));
      expect(tooManyBlocks).toHaveLength(101);

      const res = (await notionBearerClient.patch(`/blocks/${rootBlockId}/children`, {
        children: tooManyBlocks,
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_APP_011 - [Negative] Reject malformed raw JSON body (400 invalid_json)', async () => {
      const res = (await notionBearerClient.patch(
        `/blocks/${rootBlockId}/children`,
        '{"children": [malformed_json',
        { headers: { 'Content-Type': 'application/json' } }
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'invalid_json');
    });

    it('TC_BLK_APP_005b - [Negative] Reject append request without Authorization header (401 unauthorized)', async () => {
      const unauthClient = createCustomNotionClient({ authType: 'none' });
      const res = (await unauthClient.patch(`/blocks/${rootBlockId}/children`, {
        children: [],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_BLK_APP_005a - [Negative] Reject append request with invalid Bearer token (401 unauthorized)', async () => {
      const forgedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_forged_append_token_005',
      });
      const res = (await forgedClient.patch(`/blocks/${rootBlockId}/children`, {
        children: [],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_BLK_APP_006 - [Negative] Reject append request when Notion-Version header is omitted (400 missing_version)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || '',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.patch(`/blocks/${rootBlockId}/children`, {
        children: [],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });

    it('TC_BLK_APP_009 - [Negative] Reject append request when block_id is not a valid UUID (400 validation_error)', async () => {
      const res = (await notionBearerClient.patch('/blocks/not-a-valid-uuid/children', {
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: 'Test' } }] },
          },
        ],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_APP_016b - [Boundary] Reject append request with off-by-one 31-char hex block_id (400 validation_error)', async () => {
      const res = (await notionBearerClient.patch(`/blocks/${HEX_31_CHAR}/children`, {
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: 'Test' } }] },
          },
        ],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_APP_008 - [Negative] Return 404 Not Found when appending children to non-existent block_id', async () => {
      const res = (await notionBearerClient.patch(`/blocks/${UNASSIGNED_UUID}/children`, {
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: 'Ghost child' } }] },
          },
        ],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });
  });

  // ============================================================================
  // Suite 04 — PATCH /v1/blocks/{block_id} & DELETE /v1/blocks/{block_id} (Stateless Negative & Boundary Suite)
  // ============================================================================
  describe('Suite 04: PATCH & DELETE /v1/blocks/{block_id} — Stateless Negative & Boundary Contract Suite', () => {
    it('TC_BLK_UPD_008 - [Negative] Reject PATCH /v1/blocks/{block_id} with invalid UUID (400 validation_error)', async () => {
      const res = (await notionBearerClient.patch('/blocks/not-a-valid-uuid', {
        paragraph: { rich_text: [{ type: 'text', text: { content: 'Updated' } }] },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_UPD_014b - [Boundary] Reject PATCH /v1/blocks/{block_id} with 31-char hex UUID (400 validation_error)', async () => {
      const res = (await notionBearerClient.patch(`/blocks/${HEX_31_CHAR}`, {
        paragraph: { rich_text: [{ type: 'text', text: { content: 'Updated' } }] },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_UPD_007 - [Negative] Return 404 Not Found on PATCH /v1/blocks/{block_id} for non-existent UUID', async () => {
      const res = (await notionBearerClient.patch(`/blocks/${UNASSIGNED_UUID}`, {
        paragraph: { rich_text: [{ type: 'text', text: { content: 'Updated' } }] },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_BLK_UPD_004b - [Negative] Reject PATCH /v1/blocks/{block_id} without Authorization header (401 unauthorized)', async () => {
      const unauthClient = createCustomNotionClient({ authType: 'none' });
      const res = (await unauthClient.patch(`/blocks/${UNASSIGNED_UUID}`, {
        paragraph: { rich_text: [] },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_BLK_UPD_004a - [Negative] Reject PATCH /v1/blocks/{block_id} with invalid Bearer token (401 unauthorized)', async () => {
      const forgedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_forged_update_token_004',
      });
      const res = (await forgedClient.patch(`/blocks/${UNASSIGNED_UUID}`, {
        paragraph: { rich_text: [] },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_BLK_UPD_005 - [Negative] Reject PATCH /v1/blocks/{block_id} when Notion-Version is omitted (400 missing_version)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || '',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.patch(`/blocks/${UNASSIGNED_UUID}`, {
        paragraph: { rich_text: [] },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });

    it('TC_BLK_UPD_010 - [Negative] Reject PATCH /v1/blocks/{block_id} with malformed JSON body (400 invalid_json)', async () => {
      const res = (await notionBearerClient.patch(
        `/blocks/${rootBlockId}`,
        '{"paragraph": broken_json',
        { headers: { 'Content-Type': 'application/json' } }
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'invalid_json');
    });

    it('TC_BLK_DEL_008 - [Negative] Reject DELETE /v1/blocks/{block_id} with invalid UUID (400 validation_error)', async () => {
      const res = (await notionBearerClient.delete('/blocks/not-a-valid-uuid')) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_DEL_010b - [Boundary] Reject DELETE /v1/blocks/{block_id} with 31-char hex UUID (400 validation_error)', async () => {
      const res = (await notionBearerClient.delete(`/blocks/${HEX_31_CHAR}`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_DEL_007 - [Negative] Return 404 Not Found on DELETE /v1/blocks/{block_id} for non-existent UUID', async () => {
      const res = (await notionBearerClient.delete(
        `/blocks/${UNASSIGNED_UUID}`
      )) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_BLK_DEL_010a - [Boundary] Return 404 Not Found on DELETE /v1/blocks/{block_id} for nil UUID', async () => {
      const res = (await notionBearerClient.delete(`/blocks/${NIL_UUID}`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_BLK_DEL_004b - [Negative] Reject DELETE /v1/blocks/{block_id} without Authorization header (401 unauthorized)', async () => {
      const unauthClient = createCustomNotionClient({ authType: 'none' });
      const res = (await unauthClient.delete(`/blocks/${UNASSIGNED_UUID}`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_BLK_DEL_004a - [Negative] Reject DELETE /v1/blocks/{block_id} with invalid Bearer token (401 unauthorized)', async () => {
      const forgedClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: 'ntn_forged_delete_token_004',
      });
      const res = (await forgedClient.delete(`/blocks/${UNASSIGNED_UUID}`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 401, 'unauthorized');
    });

    it('TC_BLK_DEL_005 - [Negative] Reject DELETE /v1/blocks/{block_id} when Notion-Version is omitted (400 missing_version)', async () => {
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || '',
        omitNotionVersion: true,
      });
      const res = (await noVersionClient.delete(`/blocks/${UNASSIGNED_UUID}`)) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'missing_version');
    });
  });
});
