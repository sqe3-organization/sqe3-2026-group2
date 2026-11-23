import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { TimedAxiosResponse } from '../../../core/api/RequestManager';
import { assertCommonHeadersAndSla, assertNotionErrorContract } from '../../../core/utils/assertions';
import { DataFactory } from '../../../core/utils/dataFactory';
import { Logger } from '../../../core/utils/logger';
import { PagesAPI } from '../../../main/api/endpoints/pagesAPI';
import { BAD_UUIDS, PAGES_SLA_MS, env, sleep } from '../../hooks/pages/pagesHooks';

const pagesAPI = new PagesAPI();

// Optional data. Cases that need it are skipped when it is empty
const UNSHARED_PAGE_ID = env('unsharedPageId');

const titleProperty = (content: string) => ({
  title: { title: [{ type: 'text', text: { content } }] },
});

// Removes UUIDs from an error message so two 404 messages can be compared
const withoutIds = (message: string) =>
  String(message).replace(/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/gi, 'ID');

describe('Pages API — Stateless tests without preconditions', () => {
  const telemetryLog: Array<{ testName: string; status: number; durationMs: number }> = [];
  let lastResponse: TimedAxiosResponse | null = null;

  // Keeps the latest response for the telemetry and checks the response time of the Pages module
  const track = (res: TimedAxiosResponse) => {
    lastResponse = res;
    expect(res.durationMs).toBeLessThan(PAGES_SLA_MS);
    return res;
  };

  // Lifecycle Hook 1: beforeAll — validate the environment before the stateless run
  beforeAll(() => {
    expect(process.env.NOTION_BASE_URL || 'https://api.notion.com/v1').toContain('/v1');
    expect(env('notionToken'), 'NOTION_TOKEN must be set').toBeTruthy();
  });

  // Lifecycle Hook 2: beforeEach — Notion rate-limit guard (350 ms) and per-test state reset
  beforeEach(async () => {
    lastResponse = null;
    await sleep(350);
  });

  // Lifecycle Hook 3: afterEach — record latency and HTTP status telemetry
  afterEach((context) => {
    if (lastResponse) {
      telemetryLog.push({ testName: context.task.name, status: lastResponse.status, durationMs: lastResponse.durationMs });
      Logger.debug(`[Pages stateless] ${context.task.name} -> ${lastResponse.status} (${lastResponse.durationMs} ms)`);
    }
  });

  // Lifecycle Hook 4: afterAll — clean up memory state
  afterAll(() => {
    telemetryLog.length = 0;
  });

  // ==========================================================================
  // 1. POST /v1/pages — body and parent validation
  // ==========================================================================
  describe('POST /v1/pages — Stateless body and parent validation', () => {
    it('TC_PAGES_017 - [Negative] Reject malformed JSON body "{" with invalid_json (400)', async () => {
      const res = track(await pagesAPI.createPage('{'));

      assertNotionErrorContract(res, 400, 'invalid_json');
    });

    it.each(['', '{"parent":{},}', 'not json'])(
      'TC_PAGES_017 - [Negative] Reject malformed JSON body variant %j (400)',
      async (rawBody) => {
        const res = track(await pagesAPI.createPage(rawBody));

        expect(res.status).toBe(400);
        assertCommonHeadersAndSla(res);
        expect(res.data.object).toBe('error');
      }
    );

    it('TC_PAGES_019 - [Negative] Reject page creation without parent (400 validation_error)', async () => {
      const res = track(await pagesAPI.createPage({ properties: titleProperty('no parent') }));

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_PAGES_019 - [Negative] Reject page creation with an empty parent object {} (400 validation_error)', async () => {
      const res = track(await pagesAPI.createPage({ parent: {}, properties: titleProperty('empty parent') }));

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it.each(BAD_UUIDS)('TC_PAGES_021 - [Negative] Reject invalid parent page_id %j (400 validation_error)', async (badId) => {
      const res = track(await pagesAPI.createPage({ parent: { page_id: badId }, properties: titleProperty('bad uuid') }));

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_PAGES_022 - [Negative] Return object_not_found for a parent page that does not exist (404)', async () => {
      const res = track(
        await pagesAPI.createPage({ parent: { page_id: DataFactory.uuid() }, properties: titleProperty('ghost parent') })
      );

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_PAGES_044 - [Boundary] Reject an empty string as parent page_id (400 validation_error)', async () => {
      const res = track(await pagesAPI.createPage({ parent: { page_id: '' }, properties: titleProperty('x') }));

      assertNotionErrorContract(res, 400, 'validation_error');
    });
  });

  // ==========================================================================
  // 2. GET /v1/pages/{page_id} — page ID validation
  // ==========================================================================
  describe('GET /v1/pages/{page_id} — Stateless page ID validation', () => {
    it.each(BAD_UUIDS)('TC_PAGES_GET_012 - [Negative] Reject invalid page ID %j (400 validation_error)', async (badId) => {
      const res = track(await pagesAPI.getPage(badId));

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_PAGES_GET_013 - [Negative] Return object_not_found for a page that does not exist (404)', async () => {
      const res = track(await pagesAPI.getPage(DataFactory.uuid()));

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it('TC_PAGES_GET_020 - [Boundary] Handle an empty page ID in the path without a 5xx error (400/404)', async () => {
      const res = track(await pagesAPI.getPage(''));

      expect([400, 404]).toContain(res.status);
      expect(res.status).toBeLessThan(500);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('error');
      expect(typeof res.data.message).toBe('string');
      expect(res.data.message.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 3. GET /v1/pages/{page_id}/properties/{property_id} — not found checks
  // ==========================================================================
  describe('GET /v1/pages/{page_id}/properties/{property_id} — Stateless not found checks', () => {
    it('TC_PAGES_PROP_012 - [Negative] Return object_not_found for a property of a page that does not exist (404)', async () => {
      const res = track(await pagesAPI.getPageProperty(DataFactory.uuid(), 'title'));

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it.skipIf(!UNSHARED_PAGE_ID)(
      'TC_PAGES_PROP_012 - [Negative] Return the same 404 for an unshared page as for a page that does not exist',
      async () => {
        const missing = await pagesAPI.getPageProperty(DataFactory.uuid(), 'title');
        await sleep(350);
        const unshared = track(await pagesAPI.getPageProperty(UNSHARED_PAGE_ID, 'title'));

        assertNotionErrorContract(unshared, 404, 'object_not_found');
        expect(unshared.data.code).toBe(missing.data.code);
        expect(withoutIds(unshared.data.message)).toBe(withoutIds(missing.data.message));
      }
    );
  });

  // ==========================================================================
  // 4. PATCH /v1/pages/{page_id} — page ID validation
  // ==========================================================================
  describe('PATCH /v1/pages/{page_id} — Stateless page ID validation', () => {
    it.each(BAD_UUIDS)('TC_PAGES_PATCH_019 - [Negative] Reject update of invalid page ID %j (400 validation_error)', async (badId) => {
      const res = track(await pagesAPI.updatePage(badId, { properties: {} }));

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_PAGES_PATCH_020 - [Negative] Return object_not_found when updating a page that does not exist (404)', async () => {
      const res = track(await pagesAPI.updatePage(DataFactory.uuid(), { properties: titleProperty('x') }));

      assertNotionErrorContract(res, 404, 'object_not_found');
    });

    it.skipIf(!UNSHARED_PAGE_ID)(
      'TC_PAGES_PATCH_021 - [Negative] Return the same 404 for an unshared page as for a page that does not exist',
      async () => {
        const body = { properties: titleProperty('x') };
        const missing = await pagesAPI.updatePage(DataFactory.uuid(), body);
        await sleep(350);
        const unshared = track(await pagesAPI.updatePage(UNSHARED_PAGE_ID, body));

        assertNotionErrorContract(unshared, 404, 'object_not_found');
        expect(unshared.data.code).toBe(missing.data.code);
        expect(withoutIds(unshared.data.message)).toBe(withoutIds(missing.data.message));
      }
    );
  });
});
