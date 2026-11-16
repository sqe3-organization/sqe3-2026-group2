/**
 * Activity #6 — Suite 01: POST /v1/pages — Preconditioned Page Creation
 * Migrated from Notion_Pages.postman_collection.json (folder "POST /v1/pages").
 * 40 preconditioned test cases. Each case builds its own data by API, runs the request under test,
 * verifies status, body, headers, Zod schema and data integrity, and moves its pages to the trash.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  startCase,
  cv,
  env,
  check,
  assertChecks,
  commonChecks,
  cleanupCase,
  CASE_TIMEOUT_MS,
  headers,
  pagesUrl,
  pagesPath,
  sendRequest,
  send,
  uniq,
  UUID,
  hdr,
  track,
  setBody,
  parent,
  dsBasic,
  fullPrep,
  blk,
  blocks,
  nest,
  tree1000,
  bodyOfSize,
  cb,
  children,
  childCount,
  query,
  inQuery,
  val,
  authFails
} from '../../src/pages/pagesKit.js';
import { expectPageSchema } from '../../src/pages/pageSchemas.js';

describe('Activity #6 — Suite 01: POST /v1/pages — Preconditioned Page Creation', () => {
  beforeAll(() => {
    expect(env('notionToken'), 'NOTION_TOKEN must be set').toBeTruthy();
    expect(env('rootPageId'), 'NOTION_ROOT_PAGE_ID must be set').toBeTruthy();
  });

  it('TC_PAGES_001 - [Happy Path] Verify that a page can be created under a parent page', async () => {
    const testCase = startCase('TC_PAGES_001', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{"parent":{"page_id":"{{parentPageId}}"},"properties":{"title":{"title":[{"text":{"content":"{{pageTitle}}"}}]}}}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    // 1. Parent page created by API under the root page shared with the integration
    // 2. Test data for the page that the test will create
    cv.set("pageTitle", uniq("QA product"));
    try {
      const response = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: uniq("Parent") } }] } },
          }),
        },
      });
      cv.set("parentPageId", response.json().id);
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const jsonData: any = res.data;
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should contain the expected data", () => {
        expect(jsonData.object).to.eql("page");
        expect(jsonData.id).to.match(UUID);
        expect(jsonData.parent.type).to.eql("page_id");
        expect(jsonData.parent.page_id).to.eql(cv.get("parentPageId"));
        expect(jsonData.properties.title.title[0].plain_text).to.eql(cv.get("pageTitle"));
        expect(jsonData.in_trash).to.be.false;
      });
      check("Response schema should be valid", () => {
        expectPageSchema(jsonData);
      });
      cv.set("pageId", jsonData?.id);
      track(jsonData?.id);

      // Data integrity. GET returns the same page
      const response = await sendRequest({ url: `${pagesUrl}/${cv.get("pageId")}`, method: "GET", header: headers });
      check("[Data integrity] - Status code should be 200", () => {
        expect(response.code).to.eql(200);
      });
      check("[Data integrity] - The retrieved page should match the created page", () => {
        const page = response.json();
        expect(page.id).to.eql(jsonData.id);
        expect(page.parent.page_id).to.eql(cv.get("parentPageId"));
        expect(page.properties.title.title[0].plain_text).to.eql(cv.get("pageTitle"));
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. The created page and the parent page are moved to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_002 - [Happy Path] Verify that a row can be created in a data source', async () => {
    const testCase = startCase('TC_PAGES_002', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse1 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse1.json().id;
      cv.set("parentPageId", p);
      const d = await dsBasic(p);
      const t = uniq("row");
      cv.set("pageTitle", t);
      setBody({
        parent: { type: "data_source_id", data_source_id: d.ds },
        properties: { Name: { title: [{ type: "text", text: { content: t } }] }, Count: { number: 42 } },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      check("Parent type should be data_source_id", () => {
        expect(j.parent.type).to.eql("data_source_id");
      });
      check("Count should be 42", () => {
        expect(j.properties.Count.number).to.eql(42);
      });
      check("Name should match", () => {
        expect(val(j.properties.Name)).to.eql(cv.get("pageTitle"));
      });
      {
        const condition = await inQuery(cv.get("dsId"), j.id);
        check("[Data integrity] The row should appear in the data source query", () => {
          expect(!!condition).to.be.true;
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_003 - [Happy Path] Verify that the response contains all metadata fields of the created page', async () => {
    const testCase = startCase('TC_PAGES_003', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse2 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse2.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      check("Metadata fields should be consistent", () => {
        expect(j.id).to.match(UUID);
        expect(Math.abs(new Date(j.last_edited_time).getTime() - new Date(j.created_time).getTime())).to.be.below(60000);
        expect(j.created_by.id).to.match(UUID);
        expect(j.last_edited_by.id).to.match(UUID);
        expect(j.archived === undefined || j.archived === false).to.be.true;
        expect(j.in_trash).to.be.false;
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_004 - [Happy Path] Verify that a page can be created with children blocks in the same order', async () => {
    const testCase = startCase('TC_PAGES_004', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse3 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse3.json().id;
      cv.set("parentPageId", p);

      setBody(
        cb(p, {
          children: [
            blk("heading_1", "H"),
            blk("paragraph", "P"),
            blk("bulleted_list_item", "B"),
            blk("to_do", "T", { checked: false }),
            blk("code", "C", { language: "javascript" }),
          ],
        }),
      );
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const bs = await children(j.id);
      check("[Data integrity] Blocks should keep the order and types", () => {
        expect(bs.map((b: any) => b.type)).to.eql([
          "heading_1",
          "paragraph",
          "bulleted_list_item",
          "to_do",
          "code",
        ]);
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_005 - [Happy Path] Verify that a page can be created with nested blocks', async () => {
    const testCase = startCase('TC_PAGES_005', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse4 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse4.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p, { children: [nest(1)] }));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const bs = await children(j.id);
      check("[Data integrity] One top-level block", () => {
        expect(bs.length).to.eql(1);
      });
      check("[Data integrity] The toggle should have children", () => {
        expect(!!bs[0].has_children).to.be.true;
      });
      const cs = await children(bs[0].id);
      check("[Data integrity] The nested block should exist", () => {
        expect(cs.length).to.eql(1);
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_006 - [Happy Path] Verify that a page can be created with an icon and a cover', async () => {
    const testCase = startCase('TC_PAGES_006', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse5 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse5.json().id;
      cv.set("parentPageId", p);

      setBody(
        cb(p, {
          icon: { type: "emoji", emoji: "📝" },
          cover: { type: "external", external: { url: "https://example.com/cover.png" } },
        }),
      );
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      check("Icon emoji should match", () => {
        expect(j.icon.emoji).to.eql("📝");
      });
      check("Cover type should be external", () => {
        expect(j.cover.type).to.eql("external");
      });
      check("Cover URL should match", () => {
        expect(j.cover.external.url).to.eql("https://example.com/cover.png");
      });
      const g = await send("GET", `${pagesPath}/${j.id}`, null);
      check("[Data integrity] icon persisted", () => {
        expect(g.json.icon.emoji).to.eql("📝");
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_007 - [Happy Path] Verify that a row can be created with every writable property type', async () => {
    const testCase = startCase('TC_PAGES_007', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse6 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse6.json().id;
      cv.set("parentPageId", p);
      const f = await fullPrep(p);
      setBody({ parent: { type: "data_source_id", data_source_id: f.d.ds }, properties: f.fp.props });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const E = JSON.parse(cv.get("expected"));
      Object.keys(E).forEach((k: any) =>
        check("Property " + k + " should keep the value sent", () => {
          expect(val(j.properties[k])).to.eql(E[k]);
        }),
      );
      const g = await send("GET", `${pagesPath}/${j.id}`, null);
      Object.keys(E).forEach((k: any) =>
        check("[Data integrity] " + k + " persisted", () => {
          expect(val(g.json.properties[k])).to.eql(E[k]);
        }),
      );
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_008 - [Happy Path] Verify that a minimal page and an untitled page can be created', async () => {
    const testCase = startCase('TC_PAGES_008', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse7 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse7.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      check("icon should be null", () => {
        expect(j.icon).to.eql(null);
      });
      check("cover should be null", () => {
        expect(j.cover).to.eql(null);
      });
      {
        const actual = (await children(j.id)).length;
        const expected = 0;
        check("[Data integrity] no blocks", () => {
          expect(actual).to.eql(expected);
        });
      }
      const a = await send("POST", "/v1/pages", {
        parent: { page_id: p },
        properties: { title: { title: [{ type: "text", text: { content: "" } }] } },
      });
      check("Empty title content should be accepted", () => {
        expect(a.code, "status").to.eql(200);
      });
      const b = await send("POST", "/v1/pages", {
        parent: { page_id: p },
        properties: { title: { title: [] } },
      });
      check("Empty title array should be accepted", () => {
        expect(b.code, "status").to.eql(200);
      });
      check("The untitled page should have an empty title", () => {
        expect(val(a.json.properties.title)).to.eql("");
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_010 - [Happy Path] Verify that new select and multi_select options are created automatically', async () => {
    const testCase = startCase('TC_PAGES_010', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse8 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse8.json().id;
      cv.set("parentPageId", p);
      const d = await dsBasic(p);
      cv.set("pageTitle", uniq("row"));
      setBody({
        parent: { type: "data_source_id", data_source_id: d.ds },
        properties: {
          Name: { title: [{ type: "text", text: { content: cv.get("pageTitle") } }] },
          Choice: { select: { name: "NewOpt-" + Date.now() } },
          Tags: { multi_select: [{ name: "A1" }, { name: "B1" }] },
        },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const ds = await send("GET", "/v1/data_sources/" + cv.get("dsId"));
      const names = (o: any) => o.map((x: any) => x.name);
      check("[Data integrity] The new select option should exist in the schema", () => {
        expect(!!names(ds.json.properties.Choice.select.options).includes(j.properties.Choice.select.name))
          .to.be.true;
      });
      check("[Data integrity] The new multi_select options should exist", () => {
        expect(
          !!(
            names(ds.json.properties.Tags.multi_select.options).includes("A1") &&
            names(ds.json.properties.Tags.multi_select.options).includes("B1")
          ),
        ).to.be.true;
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_011 - [Happy Path] Verify that date values are stored correctly in all variants', async () => {
    const testCase = startCase('TC_PAGES_011', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse9 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse9.json().id;
      cv.set("parentPageId", p);
      const d = await dsBasic(p);
      setBody({
        parent: { type: "data_source_id", data_source_id: d.ds },
        properties: {
          Name: { title: [{ type: "text", text: { content: uniq("d1") } }] },
          When: { date: { start: "2026-11-01" } },
        },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      check("Start-only date should be stored", () => {
        expect(j.properties.When.date.start).to.eql("2026-11-01");
      });
      const ds = cv.get("dsId");
      const b = await send("POST", "/v1/pages", {
        parent: { type: "data_source_id", data_source_id: ds },
        properties: {
          Name: { title: [{ type: "text", text: { content: "d2" } }] },
          When: { date: { start: "2026-11-01", end: "2026-11-05" } },
        },
      });
      check("Start and end date should be accepted", () => {
        expect(b.code, "status").to.eql(200);
      });
      check("End date should be stored", () => {
        expect(b.json.properties.When.date.end).to.eql("2026-11-05");
      });
      const c = await send("POST", "/v1/pages", {
        parent: { type: "data_source_id", data_source_id: ds },
        properties: {
          Name: { title: [{ type: "text", text: { content: "d3" } }] },
          When: { date: { start: "2026-11-01T10:00:00", time_zone: "America/La_Paz" } },
        },
      });
      check("Date with time zone should be accepted", () => {
        expect(c.code, "status").to.eql(200);
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_012 - [Negative] Verify that a request without the Authorization header is rejected with 401', async () => {
    const testCase = startCase('TC_PAGES_012', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'noauth' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse10 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse10.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 401", () => {
        expect(res.status).to.eql(401);
      });
      check("Response body should be a Notion error with code unauthorized", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(401);
        expect(errorBody.code).to.eql("unauthorized");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      {
        const actual = await childCount(cv.get("parentPageId"));
        const expected = 0;
        check("[Data integrity] No page should be created", () => {
          expect(actual).to.eql(expected);
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_013 - [Negative] Verify that invalid, malformed, revoked and expired tokens are rejected with 401', async () => {
    const testCase = startCase('TC_PAGES_013', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: 'ntn_invalid_token_000' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse11 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse11.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 401", () => {
        expect(res.status).to.eql(401);
      });
      check("Response body should be a Notion error with code unauthorized", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(401);
        expect(errorBody.code).to.eql("unauthorized");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      const body = JSON.parse(cv.get("lastBody"));
      await authFails("POST", "/v1/pages", body);
      if (env("revokedToken")) {
        const r = await send("POST", "/v1/pages", body, { token: env("revokedToken") });
        check("Revoked or expired token should return 401", () => {
          expect(r.code, "status").to.eql(401);
          expect(r.json.object).to.eql("error");
          expect(r.json.code).to.eql("unauthorized");
        });
      }
      {
        const actual = await childCount(cv.get("parentPageId"));
        const expected = 0;
        check("[Data integrity] No page should be created", () => {
          expect(actual).to.eql(expected);
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_014 - [Negative] Verify that a non-Bearer authentication scheme is rejected with 401', async () => {
    const testCase = startCase('TC_PAGES_014', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'noauth' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse12 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse12.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p));
      testCase.request.setHeader("Authorization", "Basic " + env("notionToken"));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 401", () => {
        expect(res.status).to.eql(401);
      });
      check("Response body should be a Notion error with code unauthorized", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(401);
        expect(errorBody.code).to.eql("unauthorized");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      const h = hdr();
      h["Authorization"] = "Token " + env("notionToken");
      const r = await send("POST", "/v1/pages", JSON.parse(cv.get("lastBody")), {
        headers: h,
      });
      check("Token scheme should return 401", () => {
        expect(r.code, "status").to.eql(401);
        expect(r.json.object).to.eql("error");
        expect(r.json.code).to.eql("unauthorized");
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_015 - [Negative] Verify that a request without the Notion-Version header is rejected with missing_version', async () => {
    const testCase = startCase('TC_PAGES_015', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    // This test sends the request without the Notion-Version header
    testCase.request.removeHeader("Notion-Version");


    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse13 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse13.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 400", () => {
        expect(res.status).to.eql(400);
      });
      check("Response body should be a Notion error with code missing_version", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(400);
        expect(errorBody.code).to.eql("missing_version");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      {
        const actual = await childCount(cv.get("parentPageId"));
        const expected = 0;
        check("[Data integrity] No page should be created", () => {
          expect(actual).to.eql(expected);
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_016 - [Negative] Verify that an unsupported Notion-Version value is rejected with 400', async () => {
    const testCase = startCase('TC_PAGES_016', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse14 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse14.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p));
      testCase.request.setHeader("Notion-Version", "abc");
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be one of the expected codes", () => {
        expect([400]).to.include(res.status);
      });
      check("Response body should be a Notion error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      for (const v of ["2000-01-01", "2099-01-01"]) {
        const h = hdr();
        h["Notion-Version"] = v;
        const r = await send("POST", "/v1/pages", JSON.parse(cv.get("lastBody")), {
          headers: h,
        });
        check("Notion-Version " + v + " should return 400", () => {
          expect([400]).to.include(r.code);
        });
        check("Notion-Version " + v + " should return a descriptive message", () => {
          expect(!!(r.json && r.json.message)).to.be.true;
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_018 - [Negative] Verify that a Content-Type other than application/json is rejected', async () => {
    const testCase = startCase('TC_PAGES_018', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse15 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse15.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p));
      testCase.request.setHeader("Content-Type", "text/plain");
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be one of the expected codes", () => {
        expect([400, 415]).to.include(res.status);
      });
      check("Response body should be a Notion error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      const h = hdr();
      h["Content-Type"] = "application/x-www-form-urlencoded";
      const r = await send("POST", "/v1/pages", JSON.parse(cv.get("lastBody")), {
        headers: h,
      });
      check("form-urlencoded should be rejected", () => {
        expect([400, 415]).to.include(r.code);
      });
      {
        const actual = await childCount(cv.get("parentPageId"));
        const expected = 0;
        check("[Data integrity] No page should be created", () => {
          expect(actual).to.eql(expected);
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_020 - [Negative] Verify that a request with more than one parent type is rejected with validation_error', async () => {
    const testCase = startCase('TC_PAGES_020', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse16 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse16.json().id;
      cv.set("parentPageId", p);
      const d = await dsBasic(p);
      setBody({
        parent: { page_id: p, data_source_id: d.ds },
        properties: { title: { title: [{ type: "text", text: { content: "two parents" } }] } },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 400", () => {
        expect(res.status).to.eql(400);
      });
      check("Response body should be a Notion error with code validation_error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(400);
        expect(errorBody.code).to.eql("validation_error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_025 - [Negative] Verify that read-only properties are rejected with validation_error', async () => {
    const testCase = startCase('TC_PAGES_025', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse18 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse18.json().id;
      cv.set("parentPageId", p);
      const f = await fullPrep(p);
      cv.set("extra", f.ids[0]);
      setBody({
        parent: { type: "data_source_id", data_source_id: f.d.ds },
        properties: {
          Name: { title: [{ type: "text", text: { content: "ro" } }] },
          Formula: { formula: { type: "number", number: 1 } },
        },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 400", () => {
        expect(res.status).to.eql(400);
      });
      check("Response body should be a Notion error with code validation_error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(400);
        expect(errorBody.code).to.eql("validation_error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      const ds = cv.get("dsId"),
        u = cv.get("extra");
      const ro: any = {
        Rollup: { rollup: { type: "number", number: 1, function: "sum" } },
        CreatedAt: { created_time: "2026-01-01T00:00:00.000Z" },
        CreatedBy: { created_by: { id: u } },
        EditedAt: { last_edited_time: "2026-01-01T00:00:00.000Z" },
        EditedBy: { last_edited_by: { id: u } },
        Uid: { unique_id: { number: 1 } },
      };
      for (const k of Object.keys(ro)) {
        const pr: any = { Name: { title: [{ type: "text", text: { content: "ro" } }] } };
        pr[k] = ro[k];
        const r = await send("POST", "/v1/pages", {
          parent: { type: "data_source_id", data_source_id: ds },
          properties: pr,
        });
        check("Read-only property " + k + " should be rejected", () => {
          expect(r.code, "status").to.eql(400);
          expect(r.json.object).to.eql("error");
          expect(r.json.code).to.eql("validation_error");
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_026 - [Negative] Verify that a property value that does not match the schema type is rejected', async () => {
    const testCase = startCase('TC_PAGES_026', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse19 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse19.json().id;
      cv.set("parentPageId", p);
      const d = await dsBasic(p);
      setBody({
        parent: { type: "data_source_id", data_source_id: d.ds },
        properties: { Name: { title: [{ type: "text", text: { content: "x" } }] }, Count: { number: "abc" } },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 400", () => {
        expect(res.status).to.eql(400);
      });
      check("Response body should be a Notion error with code validation_error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(400);
        expect(errorBody.code).to.eql("validation_error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      check("Message should name the property", () => expect(j.message).to.include("Count"));
      const ds = cv.get("dsId");
      const bad = [
        { Choice: { select: 5 } },
        { Done: { checkbox: { a: 1 } } },
        { Link: { url: ["x"] } },
        { Tags: { multi_select: "A" } },
      ];
      for (const b of bad) {
        const r = await send("POST", "/v1/pages", {
          parent: { type: "data_source_id", data_source_id: ds },
          properties: Object.assign({ Name: { title: [{ type: "text", text: { content: "x" } }] } }, b),
        });
        check("Type mismatch " + Object.keys(b)[0] + " should return 400", () => {
          expect(r.code, "status").to.eql(400);
          expect(r.json.object).to.eql("error");
          expect(r.json.code).to.eql("validation_error");
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_027 - [Negative] Verify that a property that does not exist in the schema is rejected', async () => {
    const testCase = startCase('TC_PAGES_027', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse20 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse20.json().id;
      cv.set("parentPageId", p);
      const d = await dsBasic(p);
      setBody({
        parent: { type: "data_source_id", data_source_id: d.ds },
        properties: { Name: { title: [{ type: "text", text: { content: "x" } }] }, Nmber: { number: 1 } },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 400", () => {
        expect(res.status).to.eql(400);
      });
      check("Response body should be a Notion error with code validation_error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(400);
        expect(errorBody.code).to.eql("validation_error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      check("Message should name the unknown property", () => expect(j.message).to.include("Nmber"));
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_028 - [Negative] Verify that a page under a page cannot set properties other than title', async () => {
    const testCase = startCase('TC_PAGES_028', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse21 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse21.json().id;
      cv.set("parentPageId", p);
      setBody({
        parent: { page_id: p },
        properties: {
          title: { title: [{ type: "text", text: { content: "x" } }] },
          Status: { select: { name: "x" } },
        },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 400", () => {
        expect(res.status).to.eql(400);
      });
      check("Response body should be a Notion error with code validation_error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(400);
        expect(errorBody.code).to.eql("validation_error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      {
        const actual = await childCount(cv.get("parentPageId"));
        const expected = 0;
        check("[Data integrity] No page created", () => {
          expect(actual).to.eql(expected);
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_029 - [Negative] Verify that an invalid block type or payload is rejected', async () => {
    const testCase = startCase('TC_PAGES_029', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse22 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse22.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p, { children: [{ object: "block", type: "foo", foo: {} }] }));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 400", () => {
        expect(res.status).to.eql(400);
      });
      check("Response body should be a Notion error with code validation_error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(400);
        expect(errorBody.code).to.eql("validation_error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      const r = await send("POST", "/v1/pages", cb(p, { children: [{ object: "block", type: "paragraph" }] }));
      check("Paragraph without payload should return 400", () => {
        expect(r.code, "status").to.eql(400);
        expect(r.json.object).to.eql("error");
        expect(r.json.code).to.eql("validation_error");
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_030 - [Negative] Verify that an invalid icon or cover is rejected', async () => {
    const testCase = startCase('TC_PAGES_030', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse23 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse23.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p, { icon: { type: "emoji", emoji: "abc" } }));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 400", () => {
        expect(res.status).to.eql(400);
      });
      check("Response body should be a Notion error with code validation_error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(400);
        expect(errorBody.code).to.eql("validation_error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      for (const c of [
        { cover: { type: "external", external: { url: "ftp://x" } } },
        { cover: { type: "external", external: { url: "not-a-url" } } },
      ]) {
        const r = await send("POST", "/v1/pages", cb(p, c));
        check("Invalid cover should return 400", () => {
          expect(r.code, "status").to.eql(400);
          expect(r.json.object).to.eql("error");
          expect(r.json.code).to.eql("validation_error");
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_031 - [Negative] Verify that a page cannot be created under a parent that is in the trash', async () => {
    const testCase = startCase('TC_PAGES_031', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse24 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse24.json().id;
      cv.set("parentPageId", p);
      await send("PATCH", `${pagesPath}/${p}`, { in_trash: true });
      setBody(cb(p));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 400", () => {
        expect(res.status).to.eql(400);
      });
      check("Response body should be a Notion error with code validation_error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(400);
        expect(errorBody.code).to.eql("validation_error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_032 - [Negative] Verify that no partial page is created when one block is invalid', async () => {
    const testCase = startCase('TC_PAGES_032', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse25 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse25.json().id;
      cv.set("parentPageId", p);
      const t = uniq("partial");
      setBody(
        cb(
          p,
          {
            children: [
              blk("paragraph", "1"),
              blk("paragraph", "2"),
              blk("paragraph", "3"),
              { object: "block", type: "foo", foo: {} },
            ],
          },
          t,
        ),
      );
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 400", () => {
        expect(res.status).to.eql(400);
      });
      check("Response body should be a Notion error with code validation_error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(400);
        expect(errorBody.code).to.eql("validation_error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      {
        const actual = await childCount(cv.get("parentPageId"));
        const expected = 0;
        check("[Data integrity] No partial page should exist", () => {
          expect(actual).to.eql(expected);
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_033 - [Negative] Verify that the rate limit returns 429 and rejected requests create nothing', async () => {
    const testCase = startCase('TC_PAGES_033', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse26 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse26.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });

    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_034 - [Boundary] Verify that 100 blocks are accepted and 101 blocks are rejected', async () => {
    const testCase = startCase('TC_PAGES_034', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse27 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse27.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p, { children: blocks(100) }));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      {
        const actual = (await children(j.id)).length;
        const expected = 100;
        check("[Data integrity] 100 blocks should be stored", () => {
          expect(actual).to.eql(expected);
        });
      }
      const r = await send("POST", "/v1/pages", cb(p, { children: blocks(101) }));
      check("101 blocks should return 400", () => {
        expect(r.code, "status").to.eql(400);
        expect(r.json.object).to.eql("error");
        expect(r.json.code).to.eql("validation_error");
      });
      const r2 = await send("POST", "/v1/pages", cb(p, { children: blocks(99) }));
      check("99 blocks should be accepted", () => {
        expect(r2.code, "status").to.eql(200);
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_035 - [Boundary] Verify that an empty children array is accepted', async () => {
    const testCase = startCase('TC_PAGES_035', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse28 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse28.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p, { children: [] }));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      {
        const actual = (await children(j.id)).length;
        const expected = 0;
        check("[Data integrity] No blocks", () => {
          expect(actual).to.eql(expected);
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_036 - [Boundary] Verify that rich text of 2,000 characters is accepted and 2,001 is rejected', async () => {
    const testCase = startCase('TC_PAGES_036', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse29 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse29.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p, { children: [blk("paragraph", "x".repeat(2000))] }));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const bs = await children(j.id);
      check("[Data integrity] 2000 characters stored without truncation", () => {
        expect(bs[0].paragraph.rich_text.map((t: any) => t.plain_text).join("").length).to.eql(2000);
      });
      const r = await send("POST", "/v1/pages", cb(p, { children: [blk("paragraph", "x".repeat(2001))] }));
      check("2001 characters should return 400", () => {
        expect(r.code, "status").to.eql(400);
        expect(r.json.object).to.eql("error");
        expect(r.json.code).to.eql("validation_error");
      });
      const r2 = await send("POST", "/v1/pages", cb(p, { children: [blk("paragraph", "x".repeat(1999))] }));
      check("1999 characters should be accepted", () => {
        expect(r2.code, "status").to.eql(200);
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_037 - [Boundary] Verify that a rich text array of 100 elements is accepted and 101 is rejected', async () => {
    const testCase = startCase('TC_PAGES_037', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse30 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse30.json().id;
      cv.set("parentPageId", p);
      const mk = (n: any) => ({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: Array.from({ length: n }, () => ({ type: "text", text: { content: "a" } })) },
      });
      cv.set("extra", "");
      setBody(cb(p, { children: [mk(100)] }));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const mk = (n: any) => ({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: Array.from({ length: n }, () => ({ type: "text", text: { content: "a" } })) },
      });
      const r = await send("POST", "/v1/pages", cb(p, { children: [mk(101)] }));
      check("101 rich text elements should return 400", () => {
        expect(r.code, "status").to.eql(400);
        expect(r.json.object).to.eql("error");
        expect(r.json.code).to.eql("validation_error");
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_038 - [Boundary] Verify that two levels of block nesting are accepted and three are rejected', async () => {
    const testCase = startCase('TC_PAGES_038', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse31 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse31.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p, { children: [nest(2)] }));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const r = await send("POST", "/v1/pages", cb(p, { children: [nest(3)] }));
      check("Three levels of nesting should return 400", () => {
        expect(r.code, "status").to.eql(400);
        expect(r.json.object).to.eql("error");
        expect(r.json.code).to.eql("validation_error");
      });
      {
        const actual = await childCount(p);
        const expected = 1;
        check("[Data integrity] The rejected request should create nothing", () => {
          expect(actual).to.eql(expected);
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_039 - [Boundary] Verify that 1,000 total blocks are accepted and 1,001 are rejected', async () => {
    const testCase = startCase('TC_PAGES_039', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse32 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse32.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p, { children: tree1000(false) }));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res, 30000);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const r = await send(
        "POST",
        "/v1/pages",
        cb(cv.get("parentPageId"), { children: tree1000(true) }),
      );
      check("1001 total blocks should return 400", () => {
        expect(r.code, "status").to.eql(400);
        expect(r.json.object).to.eql("error");
        expect(r.json.code).to.eql("validation_error");
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_040 - [Boundary] Verify that a payload of about 490 KB is accepted and about 510 KB is rejected', async () => {
    const testCase = startCase('TC_PAGES_040', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse33 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse33.json().id;
      cv.set("parentPageId", p);
      setBody(bodyOfSize(p, 490000, false));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res, 30000);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const r = await send(
        "POST",
        "/v1/pages",
        bodyOfSize(cv.get("parentPageId"), 510000, true),
      );
      check("A body of about 510 KB should be rejected", () => {
        expect([400, 413]).to.include(r.code);
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_041 - [Boundary] Verify that list properties accept 100 items and reject 101', async () => {
    const testCase = startCase('TC_PAGES_041', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse34 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse34.json().id;
      cv.set("parentPageId", p);
      const f = await fullPrep(p);
      cv.set("extra", f.ids[0]);
      cv.set("targetId", f.rr.id);
      setBody({
        parent: { type: "data_source_id", data_source_id: f.d.ds },
        properties: {
          Name: { title: [{ type: "text", text: { content: "l100" } }] },
          Tags: { multi_select: Array.from({ length: 100 }, (_: any, i: any) => ({ name: "o" + i })) },
        },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const ds = cv.get("dsId");
      const r = await send("POST", "/v1/pages", {
        parent: { type: "data_source_id", data_source_id: ds },
        properties: {
          Name: { title: [{ type: "text", text: { content: "l101" } }] },
          Tags: { multi_select: Array.from({ length: 101 }, (_: any, i: any) => ({ name: "q" + i })) },
        },
      });
      check("101 multi_select items should return 400", () => {
        expect(r.code, "status").to.eql(400);
        expect(r.json.object).to.eql("error");
        expect(r.json.code).to.eql("validation_error");
      });
      const r2 = await send("POST", "/v1/pages", {
        parent: { type: "data_source_id", data_source_id: ds },
        properties: {
          Name: { title: [{ type: "text", text: { content: "l101" } }] },
          Related: {
            relation: Array.from({ length: 101 }, () => ({ id: cv.get("targetId") })),
          },
        },
      });
      check("101 relation items should return 400", () => {
        expect(r2.code, "status").to.eql(400);
        expect(r2.json.object).to.eql("error");
        expect(r2.json.code).to.eql("validation_error");
      });
      const r3 = await send("POST", "/v1/pages", {
        parent: { type: "data_source_id", data_source_id: ds },
        properties: {
          Name: { title: [{ type: "text", text: { content: "l101" } }] },
          Who: { people: Array.from({ length: 101 }, () => ({ id: cv.get("extra") })) },
        },
      });
      check("101 people items should return 400", () => {
        expect(r3.code, "status").to.eql(400);
        expect(r3.json.object).to.eql("error");
        expect(r3.json.code).to.eql("validation_error");
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_042 - [Boundary] Verify that a url property accepts 2,000 characters and rejects 2,001', async () => {
    const testCase = startCase('TC_PAGES_042', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse35 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse35.json().id;
      cv.set("parentPageId", p);
      const d = await dsBasic(p);
      setBody({
        parent: { type: "data_source_id", data_source_id: d.ds },
        properties: {
          Name: { title: [{ type: "text", text: { content: "u" } }] },
          Link: { url: "https://example.com/" + "a".repeat(1980) },
        },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const r = await send("POST", "/v1/pages", {
        parent: { type: "data_source_id", data_source_id: cv.get("dsId") },
        properties: {
          Name: { title: [{ type: "text", text: { content: "u" } }] },
          Link: { url: "https://example.com/" + "a".repeat(1981) },
        },
      });
      check("A 2001-character URL should return 400", () => {
        expect(r.code, "status").to.eql(400);
        expect(r.json.object).to.eql("error");
        expect(r.json.code).to.eql("validation_error");
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_043 - [Boundary] Verify that the parent ID is accepted with hyphens and as 32-character hex', async () => {
    const testCase = startCase('TC_PAGES_043', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse36 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse36.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      const r = await send("POST", "/v1/pages", {
        parent: { page_id: String(p).replace(/-/g, "") },
        properties: { title: { title: [{ type: "text", text: { content: "nodash" } }] } },
      });
      check("The 32-character parent ID should be accepted", () => {
        expect(r.code, "status").to.eql(200);
      });
      check("Both pages should have the same parent", () => {
        expect(String(r.json.parent.page_id).replace(/-/g, "")).to.eql(
          String(j.parent.page_id).replace(/-/g, ""),
        );
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_045 - [Boundary] Verify that an empty title is accepted', async () => {
    const testCase = startCase('TC_PAGES_045', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse37 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse37.json().id;
      cv.set("parentPageId", p);
      setBody({
        parent: { page_id: p },
        properties: { title: { title: [{ type: "text", text: { content: "" } }] } },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      check("Title should be empty", () => {
        expect(val(j.properties.title)).to.eql("");
      });
      const r = await send("POST", "/v1/pages", {
        parent: { page_id: p },
        properties: { title: { title: [] } },
      });
      check("An empty title array should be accepted", () => {
        expect(r.code, "status").to.eql(200);
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_046 - [Boundary] Verify that Unicode and special characters are stored unchanged', async () => {
    const testCase = startCase('TC_PAGES_046', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse38 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse38.json().id;
      cv.set("parentPageId", p);
      const t = "Привет 你好 😀 مرحبا < > & \" ' \\ ñ";
      setBody(cb(p, { children: [blk("paragraph", t)] }, t));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      check("Title should be returned unchanged", () => {
        expect(val(j.properties.title)).to.eql(cv.get("pageTitle"));
      });
      const bs = await children(j.id);
      check("Paragraph should be returned unchanged", () => {
        expect(bs[0].paragraph.rich_text.map((x: any) => x.plain_text).join("")).to.eql(
          cv.get("pageTitle"),
        );
      });
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_047 - [Boundary] Verify that numeric edge values are stored without precision loss and out-of-range values are rejected', async () => {
    const testCase = startCase('TC_PAGES_047', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse39 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse39.json().id;
      cv.set("parentPageId", p);
      const d = await dsBasic(p);
      setBody({
        parent: { type: "data_source_id", data_source_id: d.ds },
        properties: {
          Name: { title: [{ type: "text", text: { content: "n" } }] },
          Count: { number: 9007199254740991 },
        },
      });
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      check("The largest safe integer should be stored exactly", () => {
        expect(j.properties.Count.number).to.eql(9007199254740991);
      });
      const ds = cv.get("dsId");
      for (const v of [0, -1, 1.5, -9007199254740991]) {
        const r = await send("POST", "/v1/pages", {
          parent: { type: "data_source_id", data_source_id: ds },
          properties: { Name: { title: [{ type: "text", text: { content: "n" } }] }, Count: { number: v } },
        });
        check("Number " + v + " should be accepted", () => {
          expect(r.code, "status").to.eql(200);
        });
        check("Number " + v + " should be stored exactly", () => {
          expect(r.json.properties.Count.number).to.eql(v);
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);

  it('TC_PAGES_048 - [Negative] Verify that XSS and injection payloads are stored as literal text', async () => {
    const testCase = startCase('TC_PAGES_048', {
      method: 'POST',
      url: '{{apiBaseURL}}{{pagesEndpoint}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse40 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent - " + Date.now() } }] } },
          }),
        },
      });
      const p = parentResponse40.json().id;
      cv.set("parentPageId", p);
      setBody(cb(p, {}, "<script>alert(1)</script>"));
    } catch (err) {
      console.error(err);
      cv.set("precondError", String(err));
    }

    // REQUEST UNDER TEST
    const res = await testCase.sendMain();

    // ASSERTIONS, DATA INTEGRITY AND CLEANUP
    const j: any = res.data;
    const p = cv.get("parentPageId");
    const p2 = cv.get("parent2Id");
    const id = cv.get("pageId");
    const tid = cv.get("targetId");
    try {
      commonChecks(res);
      check("Status code should be 200", () => {
        expect(res.status).to.eql(200);
      });
      check("Response body should be a page object", () => {
        expect(j.object).to.eql("page");
        expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(j.in_trash).to.be.false;
      });
      check("Response body should contain the metadata fields", () => {
        expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
        expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
        expect(j.created_by.object).to.eql("user");
        expect(j.last_edited_by.object).to.eql("user");
      });
      check("Response schema should be valid", () => {
        expectPageSchema(j);
      });
      check("The script tag should be stored as literal text", () => {
        expect(val(j.properties.title)).to.eql("<script>alert(1)</script>");
      });
      for (const t of ["' OR 1=1; --", "{{7*7}}", '{"$ne":null}', "javascript:alert(1)"]) {
        const r = await send("POST", "/v1/pages", cb(p, { children: [blk("paragraph", t)] }, t));
        check("Payload should be accepted as text: " + t, () => {
          expect(r.code, "status").to.eql(200);
        });
        check("Payload should be returned unchanged: " + t, () => {
          expect(val(r.json.properties.title)).to.eql(t);
        });
        check("The payload should never be evaluated", () => {
          expect(!!(val(r.json.properties.title) !== "49")).to.be.true;
        });
      }
    } catch (err) {
      check("Test script should finish without errors", () => {
        throw err;
      });
    } finally {
      // CLEANUP. Notion has no permanent delete, so every created page goes to the trash
      await cleanupCase();
    }

    assertChecks();
  }, CASE_TIMEOUT_MS);
});
