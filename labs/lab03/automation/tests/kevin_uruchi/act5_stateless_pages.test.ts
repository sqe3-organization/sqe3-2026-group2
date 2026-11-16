import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  notionBearerClient,
  throttleRequest,
  TimedAxiosResponse,
} from '../../src/core/notionClient.js';
import {
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
} from '../../src/core/assertions.js';

// Response time limit of the Pages module (the same one used in the Postman collection)
const PAGES_SLA_MS = 2000;

// Invalid page IDs used by the UUID validation cases (TC_PAGES_021, TC_PAGES_GET_012, TC_PAGES_PATCH_019)
const BAD_UUIDS = ['123', 'not-a-uuid', 'a'.repeat(31), 'a'.repeat(33)];

// Optional data. Cases that need it are skipped when it is empty
const UNSHARED_PAGE_ID = process.env.NOTION_UNSHARED_PAGE_ID || '';

const titleProperty = (content: string) => ({
  title: { title: [{ type: 'text', text: { content } }] },
});

// Axios turns a string that is not valid JSON into a JSON string ("{" is sent as "\"{\""),
// so malformed bodies are sent with transformRequest disabled to reach Notion byte by byte
async function sendRawBody(method: 'POST' | 'PATCH', url: string, rawBody: string) {
  return (await notionBearerClient.request({
    method,
    url,
    data: rawBody,
    headers: { 'Content-Type': 'application/json' },
    transformRequest: [(data) => data],
  })) as TimedAxiosResponse;
}

// Removes UUIDs from an error message so two 404 messages can be compared
const withoutIds = (message: string) =>
  String(message).replace(/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/gi, 'ID');

describe('Activity #5 — Stateless API Tests Without Preconditions (Pages Module)', () => {
  const telemetryLog: Array<{ testName: string; status: number; durationMs: number }> = [];
  let lastResponse: TimedAxiosResponse | null = null;

  // Keeps the latest response for the telemetry and checks the response time of the Pages module
  const track = (res: TimedAxiosResponse) => {
    lastResponse = res;
    expect(res.durationMs).toBeLessThan(PAGES_SLA_MS);
    return res;
  };

  // Lifecycle Hook 1: beforeAll — Validate environment setup before the stateless run
  beforeAll(() => {
    expect(process.env.NOTION_BASE_URL || 'https://api.notion.com/v1').toContain('/v1');
    expect(process.env.NOTION_TOKEN, 'NOTION_TOKEN must be set').toBeTruthy();
  });

  // Lifecycle Hook 2: beforeEach — Enforce the Notion API 350 ms rate-limit guard & reset per-test state
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

  // Lifecycle Hook 4: afterAll — Clean up memory state
  afterAll(() => {
    telemetryLog.length = 0;
  });

  // ============================================================================
  // 1. POST /v1/pages (Stateless Body Validation Suite)
  // ============================================================================
  describe('Suite 01: POST /v1/pages — Stateless Body & Parent Validation', () => {
    it('TC_PAGES_017 - [Negative] Reject malformed JSON body "{" with invalid_json (400)', async () => {
      const res = track(await sendRawBody('POST', '/pages', '{'));

      assertNotionErrorContract(res, 400, 'invalid_json');
    });

    it.each(['', '{"parent":{},}', 'not json'])(
      'TC_PAGES_017 - [Negative] Reject malformed JSON body variant %j (400)',
      async (rawBody) => {
        const res = track(await sendRawBody('POST', '/pages', rawBody));

        expect(res.status).toBe(400);
        assertCommonHeadersAndSla(res);
        expect(res.data.object).toBe('error');
      }
    );

    it('TC_PAGES_019 - [Negative] Reject page creation without parent (400 validation_error)', async () => {
      const res = track(
        (await notionBearerClient.post('/pages', {
          properties: titleProperty('no parent'),
        })) as TimedAxiosResponse
      );

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_PAGES_019 - [Negative] Reject page creation with an empty parent object {} (400 validation_error)', async () => {
      const res = track(
        (await notionBearerClient.post('/pages', {
          parent: {},
          properties: titleProperty('empty parent'),
        })) as TimedAxiosResponse
      );

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it.each(BAD_UUIDS)(
      'TC_PAGES_021 - [Negative] Reject invalid parent page_id %j (400 validation_error)',
      async (badId) => {
        const res = track(
          (await notionBearerClient.post('/pages', {
            parent: { page_id: badId },
            properties: titleProperty('bad uuid'),
          })) as TimedAxiosResponse
        );

        assertNotionErrorContract(res, 400, 'validation_error');
      }
    );

    it('TC_PAGES_022 - [Negative] Return object_not_found for a parent page that does not exist (404)', async () => {
      const res = track(
        (await notionBearerClient.post('/pages', {
          parent: { page_id: randomUUID() },
          properties: titleProperty('ghost parent'),
        })) as TimedAxiosResponse
      );

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_PAGES_044 - [Boundary] Reject an empty string as parent page_id (400 validation_error)', async () => {
      const res = track(
        (await notionBearerClient.post('/pages', {
          parent: { page_id: '' },
          properties: titleProperty('x'),
        })) as TimedAxiosResponse
      );

      assertNotionErrorContract(res, 400, 'validation_error');
    });
  });

  // ============================================================================
  // 2. GET /v1/pages/{page_id} (Stateless Path Parameter Suite)
  // ============================================================================
  describe('Suite 02: GET /v1/pages/{page_id} — Stateless Page ID Validation', () => {
    it.each(BAD_UUIDS)(
      'TC_PAGES_GET_012 - [Negative] Reject invalid page ID %j (400 validation_error)',
      async (badId) => {
        const res = track((await notionBearerClient.get(`/pages/${badId}`)) as TimedAxiosResponse);

        assertNotionErrorContract(res, 400, 'validation_error');
      }
    );

    it('TC_PAGES_GET_013 - [Negative] Return object_not_found for a page that does not exist (404)', async () => {
      const res = track((await notionBearerClient.get(`/pages/${randomUUID()}`)) as TimedAxiosResponse);

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_PAGES_GET_020 - [Boundary] Handle an empty page ID in the path without a 5xx error (400/404)', async () => {
      const res = track((await notionBearerClient.get('/pages/')) as TimedAxiosResponse);

      expect([400, 404]).toContain(res.status);
      expect(res.status).toBeLessThan(500);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('error');
      expect(typeof res.data.message).toBe('string');
      expect(res.data.message.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 3. GET /v1/pages/{page_id}/properties/{property_id} (Stateless Not Found Suite)
  // ============================================================================
  describe('Suite 03: GET /v1/pages/{page_id}/properties/{property_id} — Stateless Not Found Checks', () => {
    it('TC_PAGES_PROP_012 - [Negative] Return object_not_found for a property of a page that does not exist (404)', async () => {
      const res = track(
        (await notionBearerClient.get(`/pages/${randomUUID()}/properties/title`)) as TimedAxiosResponse
      );

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it.skipIf(!UNSHARED_PAGE_ID)(
      'TC_PAGES_PROP_012 - [Negative] Return the same 404 for an unshared page as for a page that does not exist',
      async () => {
        const missing = (await notionBearerClient.get(
          `/pages/${randomUUID()}/properties/title`
        )) as TimedAxiosResponse;
        await throttleRequest(350);
        const unshared = track(
          (await notionBearerClient.get(`/pages/${UNSHARED_PAGE_ID}/properties/title`)) as TimedAxiosResponse
        );

        assertNotionErrorContract(unshared, 404, 'object_not_found');
        expect(unshared.data.code).toBe(missing.data.code);
        expect(withoutIds(unshared.data.message)).toBe(withoutIds(missing.data.message));
      }
    );
  });

  // ============================================================================
  // 4. PATCH /v1/pages/{page_id} (Stateless Path Parameter Suite)
  // ============================================================================
  describe('Suite 04: PATCH /v1/pages/{page_id} — Stateless Page ID Validation', () => {
    it.each(BAD_UUIDS)(
      'TC_PAGES_PATCH_019 - [Negative] Reject update of invalid page ID %j (400 validation_error)',
      async (badId) => {
        const res = track(
          (await notionBearerClient.patch(`/pages/${badId}`, { properties: {} })) as TimedAxiosResponse
        );

        assertNotionErrorContract(res, 400, 'validation_error');
      }
    );

    it('TC_PAGES_PATCH_020 - [Negative] Return object_not_found when updating a page that does not exist (404)', async () => {
      const res = track(
        (await notionBearerClient.patch(`/pages/${randomUUID()}`, {
          properties: titleProperty('x'),
        })) as TimedAxiosResponse
      );

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it.skipIf(!UNSHARED_PAGE_ID)(
      'TC_PAGES_PATCH_021 - [Negative] Return the same 404 for an unshared page as for a page that does not exist',
      async () => {
        const body = { properties: titleProperty('x') };
        const missing = (await notionBearerClient.patch(`/pages/${randomUUID()}`, body)) as TimedAxiosResponse;
        await throttleRequest(350);
        const unshared = track(
          (await notionBearerClient.patch(`/pages/${UNSHARED_PAGE_ID}`, body)) as TimedAxiosResponse
        );

        assertNotionErrorContract(unshared, 404, 'object_not_found');
        expect(unshared.data.code).toBe(missing.data.code);
        expect(withoutIds(unshared.data.message)).toBe(withoutIds(missing.data.message));
      }
    );
  });
});