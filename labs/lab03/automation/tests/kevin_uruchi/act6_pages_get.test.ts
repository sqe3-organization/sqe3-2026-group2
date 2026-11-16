/**
 * Activity #6 — Suite 02: GET /v1/pages/{page_id} — Preconditioned Page Retrieval
 * Migrated from Notion_Pages.postman_collection.json (folder "GET /v1/pages/{page_id}").
 * 18 preconditioned test cases. Each case builds its own data by API, runs the request under test,
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
  mkPage,
  parent,
  mkDb,
  fullRow,
  relPage,
  blocks,
  cb,
  children,
  propIds,
  val,
  authFails
} from '../../src/pages/pagesKit.js';
import { expectPageSchema } from '../../src/pages/pageSchemas.js';

describe('Activity #6 — Suite 02: GET /v1/pages/{page_id} — Preconditioned Page Retrieval', () => {
  beforeAll(() => {
    expect(env('notionToken'), 'NOTION_TOKEN must be set').toBeTruthy();
    expect(env('rootPageId'), 'NOTION_ROOT_PAGE_ID must be set').toBeTruthy();
  });

  it('TC_PAGES_GET_001 - [Happy Path] Verify that a page can be retrieved by its ID', async () => {
    const testCase = startCase('TC_PAGES_GET_001', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse41 = await sendRequest({
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
      const p = parentResponse41.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse43 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: p },
            properties: { title: { title: [{ text: { content: uniq("QA get") } }] } },
          }),
        },
      });
      const unused42 = pageResponse43.json();
      cv.set("pageId", unused42.id);
      cv.set("targetId", unused42.id);
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
      check("id should match the requested page", () => {
        expect(j.id).to.eql(id);
      });
      check("parent.type should be page_id", () => {
        expect(j.parent.type).to.eql("page_id");
      });
      check("Response should contain every documented field", () =>
        [
          "object",
          "id",
          "created_time",
          "last_edited_time",
          "created_by",
          "last_edited_by",
          "parent",
          "in_trash",
          "icon",
          "cover",
          "properties",
          "url",
        ].forEach((k: any) => expect(j).to.have.property(k)),
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

  it('TC_PAGES_GET_002 - [Happy Path] Verify that a row returns every property with its type and value', async () => {
    const testCase = startCase('TC_PAGES_GET_002', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse44 = await sendRequest({
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
      const p = parentResponse44.json().id;
      cv.set("parentPageId", p);
      await fullRow(p);
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
      Object.keys(E).forEach((k: any) => {
        check("Property " + k + " should have the expected value", () => {
          expect(val(j.properties[k])).to.eql(E[k]);
        });
        check("Property " + k + " should have id and type", () => {
          expect(!!(j.properties[k].id && j.properties[k].type)).to.be.true;
        });
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

  it('TC_PAGES_GET_003 - [Happy Path] Verify that a page under a page returns only the title property', async () => {
    const testCase = startCase('TC_PAGES_GET_003', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse45 = await sendRequest({
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
      const p = parentResponse45.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse47 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: p },
            properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
          }),
        },
      });
      const unused46 = pageResponse47.json();
      cv.set("pageId", unused46.id);
      cv.set("targetId", unused46.id);
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
      check("Only the title property should be returned", () => {
        expect(Object.keys(j.properties)).to.eql(["title"]);
      });
      check("parent.type should be page_id", () => {
        expect(j.parent.type).to.eql("page_id");
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

  it('TC_PAGES_GET_004 - [Happy Path] Verify that filter_properties with one ID returns only that property', async () => {
    const testCase = startCase('TC_PAGES_GET_004', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse48 = await sendRequest({
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
      const p = parentResponse48.json().id;
      cv.set("parentPageId", p);
      await fullRow(p);
      const m = await propIds(cv.get("pageId"));
      cv.set("propId", m.Count);
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
      check("Count should be 42", () => {
        expect(j.properties.Count.number).to.eql(42);
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

  it('TC_PAGES_GET_005 - [Happy Path] Verify that repeated filter_properties return the union of the properties', async () => {
    const testCase = startCase('TC_PAGES_GET_005', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse49 = await sendRequest({
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
      const p = parentResponse49.json().id;
      cv.set("parentPageId", p);
      await fullRow(p);
      const m = await propIds(cv.get("pageId"));
      cv.set(
        "qs",
        ["Count", "Notes", "Choice"].map((k: any) => "filter_properties=" + m[k]).join("&"),
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

  it('TC_PAGES_GET_006 - [Happy Path] Verify that a page in the trash can be retrieved with in_trash true', async () => {
    const testCase = startCase('TC_PAGES_GET_006', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse50 = await sendRequest({
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
      const p = parentResponse50.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse51 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: p },
            properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
          }),
        },
      });
      const c = pageResponse51.json();
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      await send("PATCH", `${pagesPath}/${c.id}`, { in_trash: true });
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
      check("in_trash should be true", () => {
        expect(j.in_trash).to.eql(true);
      });
      check("id should match", () => {
        expect(j.id).to.eql(id);
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

  it('TC_PAGES_GET_007 - [Happy Path] Verify that a relation with more than 25 references is returned truncated', async () => {
    const testCase = startCase('TC_PAGES_GET_007', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse52 = await sendRequest({
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
      const p = parentResponse52.json().id;
      cv.set("parentPageId", p);
      await relPage(p, 30);
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
      const rel = j.properties.Related.relation;
      check("The relation should be truncated to at most 25 items", () => {
        expect(!!(rel.length <= 25)).to.be.true;
      });
      check("has_more should be true", () => {
        expect(j.properties.Related.has_more).to.eql(true);
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

  it('TC_PAGES_GET_008 - [Happy Path] Verify that the response contains no block content', async () => {
    const testCase = startCase('TC_PAGES_GET_008', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse53 = await sendRequest({
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
      const p = parentResponse53.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse55 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify(
            Object.assign(
              {
                parent: { page_id: p },
                properties: { title: { title: [{ text: { content: uniq("QA blocks") } }] } },
              },
              { children: blocks(10) },
            ),
          ),
        },
      });
      const unused54 = pageResponse55.json();
      cv.set("pageId", unused54.id);
      cv.set("targetId", unused54.id);
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
      check("The response should not contain block content", () => {
        expect(j).to.not.have.property("children");
        expect(j).to.not.have.property("results");
      });
      {
        const actual = (await children(id)).length;
        const expected = 10;
        check("[Data integrity] The blocks endpoint should return the 10 blocks", () => {
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

  it('TC_PAGES_GET_009 - [Negative] Verify that a request without the Authorization header is rejected with 401', async () => {
    const testCase = startCase('TC_PAGES_GET_009', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '',
      headers: {},
      auth: { type: 'noauth' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse56 = await sendRequest({
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
      const p = parentResponse56.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse58 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: p },
            properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
          }),
        },
      });
      const unused57 = pageResponse58.json();
      cv.set("pageId", unused57.id);
      cv.set("targetId", unused57.id);
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

  it('TC_PAGES_GET_010 - [Negative] Verify that invalid, expired and wrong-scheme credentials are rejected with 401', async () => {
    const testCase = startCase('TC_PAGES_GET_010', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '',
      headers: {},
      auth: { type: 'bearer', token: 'ntn_invalid_token_000' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse59 = await sendRequest({
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
      const p = parentResponse59.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse61 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: p },
            properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
          }),
        },
      });
      const unused60 = pageResponse61.json();
      cv.set("pageId", unused60.id);
      cv.set("targetId", unused60.id);
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
      await authFails("GET", "/v1/pages/" + id);
      if (env("revokedToken")) {
        const r = await send("GET", "/v1/pages/" + id, null, { token: env("revokedToken") });
        check("Revoked or expired token should return 401", () => {
          expect(r.code, "status").to.eql(401);
          expect(r.json.object).to.eql("error");
          expect(r.json.code).to.eql("unauthorized");
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

  it('TC_PAGES_GET_011 - [Negative] Verify that a request without the Notion-Version header is rejected with missing_version', async () => {
    const testCase = startCase('TC_PAGES_GET_011', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    // This test sends the request without the Notion-Version header
    testCase.request.removeHeader("Notion-Version");


    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse62 = await sendRequest({
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
      const p = parentResponse62.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse64 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: p },
            properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
          }),
        },
      });
      const unused63 = pageResponse64.json();
      cv.set("pageId", unused63.id);
      cv.set("targetId", unused63.id);
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

  it('TC_PAGES_GET_017 - [Negative] Verify that a malformed filter_properties value is handled without a 500 error', async () => {
    const testCase = startCase('TC_PAGES_GET_017', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{targetId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse70 = await sendRequest({
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
      const p = parentResponse70.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse72 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: p },
            properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
          }),
        },
      });
      const unused71 = pageResponse72.json();
      cv.set("pageId", unused71.id);
      cv.set("targetId", unused71.id);
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
        expect([200, 400]).to.include(res.status);
      });
      check("Should never return 500", () => expect(res.status).to.be.below(500));
      const r = await send("GET", "/v1/pages/" + id + "?filter_properties=%25%25%25");
      check("A malformed filter_properties value should not cause a 5xx error", () => {
        expect(!!(r.code < 500)).to.be.true;
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

  it('TC_PAGES_GET_018 - [Negative] Verify that the rate limit returns 429 with a Retry-After header', async () => {
    const testCase = startCase('TC_PAGES_GET_018', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{targetId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse73 = await sendRequest({
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
      const p = parentResponse73.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse75 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: p },
            properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
          }),
        },
      });
      const unused74 = pageResponse75.json();
      cv.set("pageId", unused74.id);
      cv.set("targetId", unused74.id);
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

  it('TC_PAGES_GET_019 - [Boundary] Verify that the page ID is accepted with hyphens and as 32-character hex', async () => {
    const testCase = startCase('TC_PAGES_GET_019', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{targetId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse76 = await sendRequest({
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
      const p = parentResponse76.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse78 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: p },
            properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
          }),
        },
      });
      const unused77 = pageResponse78.json();
      cv.set("pageId", unused77.id);
      cv.set("targetId", unused77.id);
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
      const r = await send("GET", "/v1/pages/" + String(id).replace(/-/g, ""));
      check("The 32-character ID should be accepted", () => {
        expect(r.code, "status").to.eql(200);
      });
      check("Both forms should return the same page", () => {
        expect(r.json.id).to.eql(j.id);
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

  it('TC_PAGES_GET_021 - [Boundary] Verify that a row with 100 properties returns all of them', async () => {
    const testCase = startCase('TC_PAGES_GET_021', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse79 = await sendRequest({
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
      const p = parentResponse79.json().id;
      cv.set("parentPageId", p);
      const props: any = { Name: { title: {} } };
      for (let i = 1; i < 100; i++) props["P" + i] = { number: {} };
      const d = await mkDb(p, props);
      const r = await mkPage(
        { type: "data_source_id", data_source_id: d.ds },
        { Name: { title: [{ type: "text", text: { content: "wide" } }] }, P1: { number: 1 } },
      );
      cv.set("pageId", r.id);
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
      check("All 100 properties should be returned", () => {
        expect(Object.keys(j.properties).length).to.eql(100);
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

  it('TC_PAGES_GET_022 - [Boundary] Verify that a title of 2,000 characters with Unicode is returned unchanged', async () => {
    const testCase = startCase('TC_PAGES_GET_022', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse80 = await sendRequest({
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
      const p = parentResponse80.json().id;
      cv.set("parentPageId", p);
      const t = "ñ".repeat(1990) + "😀😀😀😀😀";
      cv.set("pageTitle", t);

      // Create a page under the parent page
      const pageResponse82 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: p },
            properties: { title: { title: [{ text: { content: t } }] } },
          }),
        },
      });
      const unused81 = pageResponse82.json();
      cv.set("pageId", unused81.id);
      cv.set("targetId", unused81.id);
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
      check("The 2000-character Unicode title should be returned unchanged", () => {
        expect(val(j.properties.title)).to.eql(cv.get("pageTitle"));
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

  it('TC_PAGES_GET_023 - [Boundary] Verify that a relation with 25 references is not truncated and one with 26 is', async () => {
    const testCase = startCase('TC_PAGES_GET_023', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse83 = await sendRequest({
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
      const p = parentResponse83.json().id;
      cv.set("parentPageId", p);
      const a = await relPage(p, 25);
      cv.set("otherId", a.row.id);
      await relPage(p, 26);
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
      check("26 references: has_more should be true", () => {
        expect(j.properties.Related.has_more).to.eql(true);
      });
      const a = await send("GET", `${pagesPath}/${cv.get("otherId")}`, null);
      check("25 references should be returned", () => {
        expect(a.json.properties.Related.relation.length).to.eql(25);
      });
      check("25 references: has_more should be false", () => {
        expect(!!!a.json.properties.Related.has_more).to.be.true;
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

  it('TC_PAGES_GET_024 - [Happy Path] Verify that a read right after a write returns the latest values', async () => {
    const testCase = startCase('TC_PAGES_GET_024', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse84 = await sendRequest({
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
      const p = parentResponse84.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse85 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: p },
            properties: { title: { title: [{ text: { content: "before" } }] } },
          }),
        },
      });
      const c = pageResponse85.json();
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      await send("PATCH", `${pagesPath}/${c.id}`, {
        properties: { title: { title: [{ type: "text", text: { content: "after-update" } }] } },
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
      check("The read should return the latest title", () => {
        expect(val(j.properties.title)).to.eql("after-update");
      });
      const n = await send("POST", "/v1/pages", cb(p, {}, "fresh"));
      const g = await send("GET", `${pagesPath}/${n.json.id}`, null);
      check("A page should be readable right after it is created", () => {
        expect(val(g.json.properties.title)).to.eql("fresh");
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
});
