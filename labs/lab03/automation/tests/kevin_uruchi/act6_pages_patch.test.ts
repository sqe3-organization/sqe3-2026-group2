/**
 * Activity #6 — Suite 05: PATCH /v1/pages/{page_id} — Preconditioned Page Updates
 * Migrated from Notion_Pages.postman_collection.json (folder "PATCH /v1/pages/{page_id}").
 * 37 preconditioned test cases. Each case builds its own data by API, runs the request under test,
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
  sleep,
  uniq,
  uuid,
  waitFor,
  track,
  setBody,
  mkPage,
  parent,
  fullRow,
  basicRow,
  dual,
  blk,
  blocks,
  cb,
  children,
  query,
  inQuery,
  notInQuery,
  val,
  authFails,
  burst429
} from '../../src/pages/pagesKit.js';
import { expectPageSchema } from '../../src/pages/pageSchemas.js';

describe('Activity #6 — Suite 05: PATCH /v1/pages/{page_id} — Preconditioned Page Updates', () => {
  beforeAll(() => {
    expect(env('notionToken'), 'NOTION_TOKEN must be set').toBeTruthy();
    expect(env('rootPageId'), 'NOTION_ROOT_PAGE_ID must be set').toBeTruthy();
  });

  it('TC_PAGES_PATCH_001 - [Happy Path] Verify that one property can be updated', async () => {
    const testCase = startCase('TC_PAGES_PATCH_001', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse223 = await sendRequest({
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
      const p = parentResponse223.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ properties: { Count: { number: 99 } } });
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
      check("Count should be 99", () => {
        expect(j.properties.Count.number).to.eql(99);
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

  it('TC_PAGES_PATCH_002 - [Happy Path] Verify that several properties can be updated in one request', async () => {
    const testCase = startCase('TC_PAGES_PATCH_002', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse224 = await sendRequest({
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
      const p = parentResponse224.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({
        properties: {
          Name: { title: [{ type: "text", text: { content: "renamed" } }] },
          Count: { number: 7 },
          Done: { checkbox: true },
          Choice: { select: { name: "Opt2" } },
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
      check("Name", () => {
        expect(val(j.properties.Name)).to.eql("renamed");
      });
      check("Count", () => {
        expect(j.properties.Count.number).to.eql(7);
      });
      check("Done", () => {
        expect(j.properties.Done.checkbox).to.eql(true);
      });
      check("Choice", () => {
        expect(j.properties.Choice.select.name).to.eql("Opt2");
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

  it('TC_PAGES_PATCH_003 - [Happy Path] Verify that properties that are not sent stay unchanged', async () => {
    const testCase = startCase('TC_PAGES_PATCH_003', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse225 = await sendRequest({
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
      const p = parentResponse225.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      const g = await send("GET", `${pagesPath}/${b.row.id}`, null);
      const s: any = {};
      ["Name", "Choice", "Tags", "Done", "Link"].forEach((k: any) => (s[k] = val(g.json.properties[k])));
      cv.set("snap", JSON.stringify(s));
      setBody({ properties: { Count: { number: 99 } } });
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
      const s = JSON.parse(cv.get("snap"));
      Object.keys(s).forEach((k: any) =>
        check("Property " + k + " should be unchanged", () => {
          expect(val(j.properties[k])).to.eql(s[k]);
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

  it('TC_PAGES_PATCH_004 - [Happy Path] Verify that each writable property type can be updated', async () => {
    const testCase = startCase('TC_PAGES_PATCH_004', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse226 = await sendRequest({
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
      const p = parentResponse226.json().id;
      cv.set("parentPageId", p);
      const f = await fullRow(p);
      cv.set("extra", JSON.stringify({ u: f.userId, r: f.relRow.id }));
      setBody({ properties: { Count: { number: 99 } } });
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
      check("Count should be updated", () => {
        expect(j.properties.Count.number).to.eql(99);
      });
      const x = JSON.parse(cv.get("extra"));
      const upd: any = {
        Name: [{ title: [{ type: "text", text: { content: "upd" } }] }, "upd"],
        Notes: [{ rich_text: [{ type: "text", text: { content: "upd notes" } }] }, "upd notes"],
        Choice: [{ select: { name: "Opt2" } }, "Opt2"],
        Tags: [{ multi_select: [{ name: "B" }] }, ["B"]],
        Done: [{ checkbox: false }, false],
        When: [{ date: { start: "2026-12-01" } }, "2026-12-01"],
        Link: [{ url: "https://example.org" }, "https://example.org"],
        Mail: [{ email: "new@example.com" }, "new@example.com"],
        Phone: [{ phone_number: "+59171111111" }, "+59171111111"],
        Who: [{ people: [{ id: x.u }] }, [x.u]],
        Related: [{ relation: [] }, []],
        Files: [
          { files: [{ name: "g.png", type: "external", external: { url: "https://example.com/g.png" } }] },
          ["g.png"],
        ],
      };
      for (const k of Object.keys(upd)) {
        const body: any = {};
        body[k] = upd[k][0];
        const r = await send("PATCH", `${pagesPath}/${id}`, { properties: body });
        check("Updating " + k + " should return 200", () => {
          expect(r.code, "status").to.eql(200);
        });
        check(k + " should have the new value", () => {
          expect(val(r.json.properties[k])).to.eql(upd[k][1]);
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

  it('TC_PAGES_PATCH_005 - [Happy Path] Verify that the title of a page under a page can be changed', async () => {
    const testCase = startCase('TC_PAGES_PATCH_005', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse227 = await sendRequest({
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
      const p = parentResponse227.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse229 = await sendRequest({
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
      const unused228 = pageResponse229.json();
      cv.set("pageId", unused228.id);
      cv.set("targetId", unused228.id);
      setBody({ properties: { title: { title: [{ type: "text", text: { content: "New title" } }] } } });
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
      check("The title should be updated", () => {
        expect(val(j.properties.title)).to.eql("New title");
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

  it('TC_PAGES_PATCH_006 - [Happy Path] Verify that icon and cover can be set', async () => {
    const testCase = startCase('TC_PAGES_PATCH_006', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse230 = await sendRequest({
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
      const p = parentResponse230.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse232 = await sendRequest({
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
      const unused231 = pageResponse232.json();
      cv.set("pageId", unused231.id);
      cv.set("targetId", unused231.id);
      setBody({
        icon: { type: "emoji", emoji: "📝" },
        cover: { type: "external", external: { url: "https://example.com/cover.png" } },
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
      check("icon", () => {
        expect(j.icon.emoji).to.eql("📝");
      });
      check("cover", () => {
        expect(j.cover.external.url).to.eql("https://example.com/cover.png");
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

  it('TC_PAGES_PATCH_007 - [Happy Path] Verify that icon and cover can be removed with null', async () => {
    const testCase = startCase('TC_PAGES_PATCH_007', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse233 = await sendRequest({
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
      const p = parentResponse233.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse235 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify(
            Object.assign(
              { parent: { page_id: p }, properties: { title: { title: [{ text: { content: uniq("ic") } }] } } },
              {
                icon: { type: "emoji", emoji: "📝" },
                cover: { type: "external", external: { url: "https://example.com/c.png" } },
              },
            ),
          ),
        },
      });
      const unused234 = pageResponse235.json();
      cv.set("pageId", unused234.id);
      cv.set("targetId", unused234.id);
      setBody({ icon: null, cover: null });
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

  it('TC_PAGES_PATCH_008 - [Happy Path] Verify that a row can be moved to the trash with in_trash true', async () => {
    const testCase = startCase('TC_PAGES_PATCH_008', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse236 = await sendRequest({
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
      const p = parentResponse236.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ in_trash: true });
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
      {
        const condition = await notInQuery(cv.get("dsId"), id);
        check("[Data integrity] The row should not appear in the data source query", () => {
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

  it('TC_PAGES_PATCH_009 - [Happy Path] Verify that a page can be restored from the trash with all its data', async () => {
    const testCase = startCase('TC_PAGES_PATCH_009', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse237 = await sendRequest({
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
      const p = parentResponse237.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      cv.set("extra", b.name);
      await send("PATCH", `${pagesPath}/${b.row.id}`, { in_trash: true });
      setBody({ in_trash: false });
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
      check("in_trash should be false", () => {
        expect(j.in_trash).to.eql(false);
      });
      check("Name should be intact", () => {
        expect(val(j.properties.Name)).to.eql(cv.get("extra"));
      });
      check("Count should be intact", () => {
        expect(j.properties.Count.number).to.eql(10);
      });
      {
        const condition = await inQuery(cv.get("dsId"), id);
        check("[Data integrity] The row should be back in the query", () => {
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

  it('TC_PAGES_PATCH_010 - [Happy Path] Verify that a page can be locked and unlocked', async () => {
    const testCase = startCase('TC_PAGES_PATCH_010', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse238 = await sendRequest({
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
      const p = parentResponse238.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse240 = await sendRequest({
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
      const unused239 = pageResponse240.json();
      cv.set("pageId", unused239.id);
      cv.set("targetId", unused239.id);
      setBody({ is_locked: true });
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
      check("is_locked should be true", () => {
        expect(j.is_locked).to.eql(true);
      });
      const r = await send("PATCH", `${pagesPath}/${id}`, { is_locked: false });
      check("Unlocking should return 200", () => {
        expect(r.code, "status").to.eql(200);
      });
      check("is_locked should be false", () => {
        expect(r.json.is_locked).to.eql(false);
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

  it('TC_PAGES_PATCH_011 - [Happy Path] Verify that last_edited metadata is updated and identity fields stay unchanged', async () => {
    const testCase = startCase('TC_PAGES_PATCH_011', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse241 = await sendRequest({
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
      const p = parentResponse241.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse242 = await sendRequest({
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
      const c = pageResponse242.json();
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      const g = await send("GET", `${pagesPath}/${c.id}`, null);
      cv.set(
        "snap",
        JSON.stringify({
          ct: g.json.created_time,
          cb: g.json.created_by.id,
          url: g.json.url,
          pr: g.json.parent,
          lt: g.json.last_edited_time,
        }),
      );
      await sleep(1100);
      setBody({ properties: { title: { title: [{ type: "text", text: { content: "meta" } }] } } });
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
      const s = JSON.parse(cv.get("snap"));
      check("last_edited_time should be later", () => {
        expect(!!(new Date(j.last_edited_time) > new Date(s.lt))).to.be.true;
      });
      check("last_edited_by should be set", () => {
        expect(!!j.last_edited_by.id).to.be.true;
      });
      check("id", () => {
        expect(j.id).to.eql(id);
      });
      check("created_time", () => {
        expect(j.created_time).to.eql(s.ct);
      });
      check("created_by", () => {
        expect(j.created_by.id).to.eql(s.cb);
      });
      check("parent", () => {
        expect(j.parent).to.eql(s.pr);
      });
      check("url", () => {
        expect(j.url).to.eql(s.url);
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

  it('TC_PAGES_PATCH_012 - [Happy Path] Verify that multi_select is replaced with the full list that is sent', async () => {
    const testCase = startCase('TC_PAGES_PATCH_012', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse243 = await sendRequest({
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
      const p = parentResponse243.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ properties: { Tags: { multi_select: [{ name: "C" }] } } });
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
      check("multi_select should be replaced by the list sent", () => {
        expect(val(j.properties.Tags)).to.eql(["C"]);
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

  it('TC_PAGES_PATCH_013 - [Happy Path] Verify that relation is replaced and the reverse relation is updated', async () => {
    const testCase = startCase('TC_PAGES_PATCH_013', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse244 = await sendRequest({
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
      const p = parentResponse244.json().id;
      cv.set("parentPageId", p);
      const d = await dual(p, 1);
      const p2 = await mkPage(
        { type: "data_source_id", data_source_id: d.projDs },
        { Name: { title: [{ type: "text", text: { content: "P2" } }] } },
      );
      cv.set(
        "extra",
        JSON.stringify({ p1: d.project.id, p2: p2.id, rev: d.revName, task: d.tasks[0] }),
      );
      cv.set("pageId", d.tasks[0]);
      setBody({ properties: { Project: { relation: [{ id: p2.id }] } } });
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
      const x = JSON.parse(cv.get("extra"));
      check("The task should relate only to the second project", () => {
        expect(j.properties.Project.relation.map((r: any) => String(r.id).replace(/-/g, ""))).to.eql([
          String(x.p2).replace(/-/g, ""),
        ]);
      });
      {
        const condition = await waitFor(async () => {
          const g = await send("GET", `${pagesPath}/${x.p1}`, null);
          return g.json.properties[x.rev].relation.length === 0;
        });
        check("[Data integrity] The first project reverse relation should be empty", () => {
          expect(!!condition).to.be.true;
        });
      }
      {
        const condition = await waitFor(async () => {
          const g = await send("GET", `${pagesPath}/${x.p2}`, null);
          return g.json.properties[x.rev].relation.some(
            (r: any) => String(r.id).replace(/-/g, "") === String(x.task).replace(/-/g, ""),
          );
        });
        check("[Data integrity] The second project reverse relation should list the task", () => {
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

  it('TC_PAGES_PATCH_014 - [Happy Path] Verify that people is replaced with the full list that is sent', async () => {
    const testCase = startCase('TC_PAGES_PATCH_014', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse245 = await sendRequest({
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
      const p = parentResponse245.json().id;
      cv.set("parentPageId", p);
      const f = await fullRow(p);
      const ids = f.users.slice(0, 2);
      cv.set("extra", JSON.stringify(ids));
      await send("PATCH", `${pagesPath}/${f.row.id}`, {
        properties: { Who: { people: ids.map((id: any) => ({ id })) } },
      });
      const keep = ids.length > 1 ? [ids[1]] : [];
      cv.set("snap", JSON.stringify(keep));
      setBody({ properties: { Who: { people: keep.map((id: any) => ({ id })) } } });
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
      check("people should be replaced by the list sent", () => {
        expect(val(j.properties.Who)).to.eql(JSON.parse(cv.get("snap")));
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

  it('TC_PAGES_PATCH_015 - [Happy Path] Verify that rich_text keeps annotations, links and mentions', async () => {
    const testCase = startCase('TC_PAGES_PATCH_015', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse246 = await sendRequest({
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
      const p = parentResponse246.json().id;
      cv.set("parentPageId", p);
      await fullRow(p);
      setBody({
        properties: {
          Notes: {
            rich_text: [
              { type: "text", text: { content: "bold" }, annotations: { bold: true } },
              { type: "text", text: { content: "italic" }, annotations: { italic: true } },
              { type: "text", text: { content: "link", link: { url: "https://example.com" } } },
              { type: "mention", mention: { page: { id: p } } },
            ],
          },
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
      const rt = j.properties.Notes.rich_text;
      check("bold should be kept", () => {
        expect(rt[0].annotations.bold).to.eql(true);
      });
      check("italic should be kept", () => {
        expect(rt[1].annotations.italic).to.eql(true);
      });
      check("link should be kept", () => {
        expect(rt[2].text.link.url).to.eql("https://example.com");
      });
      check("mention should be kept", () => {
        expect(rt[3].type).to.eql("mention");
      });
      check("The old text should be gone", () => {
        expect(!!!JSON.stringify(rt).includes("some notes")).to.be.true;
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

  it('TC_PAGES_PATCH_016 - [Negative] Verify that a request without the Authorization header is rejected with 401', async () => {
    const testCase = startCase('TC_PAGES_PATCH_016', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'noauth' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse247 = await sendRequest({
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
      const p = parentResponse247.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ properties: { Count: { number: 5 } } });
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
      const g = await send("GET", `${pagesPath}/${id}`, null);
      check("[Data integrity] Count should be unchanged", () => {
        expect(g.json.properties.Count.number).to.eql(10);
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

  it('TC_PAGES_PATCH_017 - [Negative] Verify that invalid, expired and wrong-scheme credentials are rejected with 401', async () => {
    const testCase = startCase('TC_PAGES_PATCH_017', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: 'ntn_invalid_token_000' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse248 = await sendRequest({
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
      const p = parentResponse248.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ properties: { Count: { number: 5 } } });
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
      await authFails("PATCH", "/v1/pages/" + id, { properties: { Count: { number: 5 } } });
      if (env("revokedToken")) {
        const r = await send(
          "PATCH",
          "/v1/pages/" + id,
          { properties: { Count: { number: 5 } } },
          { token: env("revokedToken") },
        );
        check("Revoked or expired token should return 401", () => {
          expect(r.code, "status").to.eql(401);
          expect(r.json.object).to.eql("error");
          expect(r.json.code).to.eql("unauthorized");
        });
      }
      const g = await send("GET", `${pagesPath}/${id}`, null);
      check("[Data integrity] Count should be unchanged", () => {
        expect(g.json.properties.Count.number).to.eql(10);
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

  it('TC_PAGES_PATCH_018 - [Negative] Verify that a request without the Notion-Version header is rejected with missing_version', async () => {
    const testCase = startCase('TC_PAGES_PATCH_018', {
      method: 'PATCH',
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
      const parentResponse249 = await sendRequest({
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
      const p = parentResponse249.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ properties: { Count: { number: 5 } } });
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

  it.skipIf(!env('tokenReadOnly'))('TC_PAGES_PATCH_022 - [Negative] Verify that an integration without update capability cannot update a page', async () => {
    const testCase = startCase('TC_PAGES_PATCH_022', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{tokenReadOnly}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse250 = await sendRequest({
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
      const p = parentResponse250.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ properties: { Count: { number: 5 } } });
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
      check("Status code should be 403", () => {
        expect(res.status).to.eql(403);
      });
      check("Response body should be a Notion error with code restricted_resource", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(403);
        expect(errorBody.code).to.eql("restricted_resource");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      const g = await send("GET", `${pagesPath}/${id}`, null);
      check("[Data integrity] Count should be unchanged", () => {
        expect(g.json.properties.Count.number).to.eql(10);
      });
      if (env("tokenInsertOnly")) {
        const r = await send(
          "PATCH",
          "/v1/pages/" + id,
          { properties: { Count: { number: 5 } } },
          { token: env("tokenInsertOnly") },
        );
        check("Insert-only token should not update", () => {
          expect(r.code, "status").to.eql(403);
          expect(r.json.object).to.eql("error");
          expect(r.json.code).to.eql("restricted_resource");
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

  it('TC_PAGES_PATCH_023 - [Negative] Verify that a malformed JSON body is rejected with invalid_json', async () => {
    const testCase = startCase('TC_PAGES_PATCH_023', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse251 = await sendRequest({
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
      const p = parentResponse251.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse253 = await sendRequest({
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
      const unused252 = pageResponse253.json();
      cv.set("pageId", unused252.id);
      cv.set("targetId", unused252.id);
      setBody("{");
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
      check("Response body should be a Notion error with code invalid_json", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(400);
        expect(errorBody.code).to.eql("invalid_json");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      const r = await send("PATCH", "/v1/pages/" + id, '{"properties":{},}');
      check("A trailing comma should return 400", () => {
        expect([400]).to.include(r.code);
      });
      const e = await send("PATCH", "/v1/pages/" + id, "");
      check("An empty body should return 400", () => {
        expect([400]).to.include(e.code);
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

  it('TC_PAGES_PATCH_024 - [Negative] Verify that read-only properties cannot be updated', async () => {
    const testCase = startCase('TC_PAGES_PATCH_024', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse254 = await sendRequest({
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
      const p = parentResponse254.json().id;
      cv.set("parentPageId", p);
      const f = await fullRow(p);
      cv.set("extra", f.userId);
      setBody({ properties: { Formula: { formula: { type: "number", number: 1 } } } });
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
      const u = cv.get("extra");
      const ro: any = {
        Rollup: { rollup: { type: "number", number: 1, function: "sum" } },
        CreatedAt: { created_time: "2026-01-01T00:00:00.000Z" },
        CreatedBy: { created_by: { id: u } },
        EditedAt: { last_edited_time: "2026-01-01T00:00:00.000Z" },
        EditedBy: { last_edited_by: { id: u } },
        Uid: { unique_id: { number: 1 } },
      };
      for (const k of Object.keys(ro)) {
        const pr: any = {};
        pr[k] = ro[k];
        const r = await send("PATCH", `${pagesPath}/${id}`, { properties: pr });
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

  it('TC_PAGES_PATCH_025 - [Negative] Verify that a property value with the wrong type is rejected', async () => {
    const testCase = startCase('TC_PAGES_PATCH_025', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse255 = await sendRequest({
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
      const p = parentResponse255.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ properties: { Count: { number: "abc" } } });
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
      for (const x of [{ Choice: { select: 5 } }, { Done: { checkbox: { a: 1 } } }]) {
        const r = await send("PATCH", `${pagesPath}/${id}`, { properties: x });
        check("Type mismatch " + Object.keys(x)[0] + " should return 400", () => {
          expect(r.code, "status").to.eql(400);
          expect(r.json.object).to.eql("error");
          expect(r.json.code).to.eql("validation_error");
        });
      }
      const g = await send("GET", `${pagesPath}/${id}`, null);
      check("[Data integrity] Count should be unchanged", () => {
        expect(g.json.properties.Count.number).to.eql(10);
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

  it('TC_PAGES_PATCH_026 - [Negative] Verify that a property that does not exist in the schema is rejected', async () => {
    const testCase = startCase('TC_PAGES_PATCH_026', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse256 = await sendRequest({
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
      const p = parentResponse256.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ properties: { Nmber: { number: 1 } } });
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

  it('TC_PAGES_PATCH_027 - [Negative] Verify that a page under a page cannot update properties other than title', async () => {
    const testCase = startCase('TC_PAGES_PATCH_027', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse257 = await sendRequest({
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
      const p = parentResponse257.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse259 = await sendRequest({
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
      const unused258 = pageResponse259.json();
      cv.set("pageId", unused258.id);
      cv.set("targetId", unused258.id);
      setBody({ properties: { Status: { select: { name: "x" } } } });
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

  it('TC_PAGES_PATCH_028 - [Negative] Verify that parent in the body is rejected and the page is not moved', async () => {
    const testCase = startCase('TC_PAGES_PATCH_028', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse260 = await sendRequest({
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
      const p = parentResponse260.json().id;
      cv.set("parentPageId", p);

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse261 = await sendRequest({
        url: pagesUrl,
        method: "POST",
        header: headers,
        body: {
          mode: "raw",
          raw: JSON.stringify({
            parent: { page_id: env("rootPageId") },
            properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
          }),
        },
      });
      const p2 = secondParentResponse261.json().id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse262 = await sendRequest({
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
      const c = pageResponse262.json();
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({ parent: { page_id: p2 } });
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
      const g = await send("GET", `${pagesPath}/${id}`, null);
      check("[Data integrity] The page should stay in its original parent", () => {
        expect(String(g.json.parent.page_id).replace(/-/g, "")).to.eql(String(p).replace(/-/g, ""));
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

  it('TC_PAGES_PATCH_029 - [Negative] Verify that children in the body are rejected and no blocks are added', async () => {
    const testCase = startCase('TC_PAGES_PATCH_029', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse263 = await sendRequest({
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
      const p = parentResponse263.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse265 = await sendRequest({
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
      const unused264 = pageResponse265.json();
      cv.set("pageId", unused264.id);
      cv.set("targetId", unused264.id);
      setBody({ children: [blk("paragraph", "x")] });
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
      {
        const actual = (await children(id)).length;
        const expected = 0;
        check("[Data integrity] No blocks should be added", () => {
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

  it.skipIf(!env('statusDataSourceId'))('TC_PAGES_PATCH_030 - [Negative] Verify that a status option that does not exist is rejected', async () => {
    const testCase = startCase('TC_PAGES_PATCH_030', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse266 = await sendRequest({
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
      const p = parentResponse266.json().id;
      cv.set("parentPageId", p);
      const ds = await send("GET", "/v1/data_sources/" + env("statusDataSourceId"));
      const pr = ds.json.properties;
      const tn = Object.keys(pr).find((k: any) => pr[k].type === "title"),
        sn = Object.keys(pr).find((k: any) => pr[k].type === "status");
      cv.set("extra", sn);
      const row = await mkPage(
        { type: "data_source_id", data_source_id: env("statusDataSourceId") },
        Object.fromEntries([[tn, { title: [{ type: "text", text: { content: uniq("QA status") } }] }]]),
      );
      track(row.id);
      cv.set("pageId", row.id);
      const body: any = { properties: {} };
      body.properties[sn as string] = { status: { name: "Nope-" + Date.now() } };
      setBody(body);
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

  it('TC_PAGES_PATCH_031 - [Negative] Verify that a relation to a page that does not exist is rejected', async () => {
    const testCase = startCase('TC_PAGES_PATCH_031', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse267 = await sendRequest({
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
      const p = parentResponse267.json().id;
      cv.set("parentPageId", p);
      await fullRow(p);
      setBody({ properties: { Related: { relation: [{ id: uuid() }] } } });
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
        expect([400, 404]).to.include(res.status);
      });
      check("Response body should be a Notion error", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      const g = await send("GET", `${pagesPath}/${id}`, null);
      check("[Data integrity] The relation should be unchanged", () => {
        expect(g.json.properties.Related.relation.length).to.eql(1);
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

  it('TC_PAGES_PATCH_032 - [Negative] Verify that invalid date, url, email, phone and people values are rejected', async () => {
    const testCase = startCase('TC_PAGES_PATCH_032', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse268 = await sendRequest({
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
      const p = parentResponse268.json().id;
      cv.set("parentPageId", p);
      await fullRow(p);
      setBody({ properties: { When: { date: { start: "2026-12-01", end: "2026-11-01" } } } });
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
      const r1 = await send("PATCH", `${pagesPath}/${id}`, {
        properties: { Who: { people: [{ id: uuid() }] } },
      });
      check("An invalid user ID should be rejected", () => {
        expect([400, 404]).to.include(r1.code);
      });
      for (const x of [
        { Link: { url: "not a url" } },
        { Mail: { email: "abc" } },
        { Phone: { phone_number: "letters" } },
      ]) {
        const r = await send("PATCH", `${pagesPath}/${id}`, { properties: x });
        check(Object.keys(x)[0] + " should be accepted or rejected without a 5xx error", () => {
          expect([200, 400]).to.include(r.code);
        });
        check("No 5xx error", () => {
          expect(!!(r.code < 500)).to.be.true;
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

  it('TC_PAGES_PATCH_033 - [Negative] Verify that an update with one invalid property changes nothing', async () => {
    const testCase = startCase('TC_PAGES_PATCH_033', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse269 = await sendRequest({
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
      const p = parentResponse269.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ properties: { Count: { number: 5 }, When: { date: { start: "bad" } } } });
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
      const g = await send("GET", `${pagesPath}/${id}`, null);
      check("[Data integrity] Count should be unchanged (atomic update)", () => {
        expect(g.json.properties.Count.number).to.eql(10);
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

  it('TC_PAGES_PATCH_034 - [Negative] Verify that a page in the trash cannot be edited until it is restored', async () => {
    const testCase = startCase('TC_PAGES_PATCH_034', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse270 = await sendRequest({
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
      const p = parentResponse270.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      await send("PATCH", `${pagesPath}/${b.row.id}`, { in_trash: true });
      setBody({ properties: { Count: { number: 5 } } });
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
      const r = await send("PATCH", `${pagesPath}/${id}`, { in_trash: false });
      check("Restoring with in_trash false alone should return 200", () => {
        expect(r.code, "status").to.eql(200);
      });
      check("The page should be restored", () => {
        expect(r.json.in_trash).to.eql(false);
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

  it('TC_PAGES_PATCH_035 - [Negative] Verify that the rate limit returns 429 and rejected updates change nothing', async () => {
    const testCase = startCase('TC_PAGES_PATCH_035', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse271 = await sendRequest({
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
      const p = parentResponse271.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ properties: { Count: { number: 1 } } });
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
        expect(j.url).to.include("notion.so");
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
      const rs = await burst429("PATCH", "/v1/pages/" + id, { properties: { Count: { number: 2 } } });
      const g = await send("GET", `${pagesPath}/${id}`, null);
      const n = rs.filter((r: any) => r.code === 200).length;
      check("[Data integrity] Rejected requests should not change the value", () => {
        expect(g.json.properties.Count.number).to.eql(n > 0 ? 2 : 1);
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

  it('TC_PAGES_PATCH_036 - [Negative] Verify that XSS and injection payloads are stored as literal text', async () => {
    const testCase = startCase('TC_PAGES_PATCH_036', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse272 = await sendRequest({
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
      const p = parentResponse272.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse274 = await sendRequest({
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
      const unused273 = pageResponse274.json();
      cv.set("pageId", unused273.id);
      cv.set("targetId", unused273.id);
      setBody({
        properties: { title: { title: [{ type: "text", text: { content: "<script>alert(1)</script>" } }] } },
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
        expect(j.url).to.include("notion.so");
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
      for (const t of ["' OR 1=1; --", "{{7*7}}", "javascript:alert(1)"]) {
        const r = await send("PATCH", `${pagesPath}/${id}`, {
          properties: { title: { title: [{ type: "text", text: { content: t } }] } },
        });
        check("Payload accepted: " + t, () => {
          expect(r.code, "status").to.eql(200);
        });
        check("Payload returned unchanged: " + t, () => {
          expect(val(r.json.properties.title)).to.eql(t);
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

  it('TC_PAGES_PATCH_037 - [Boundary] Verify that rich text of 2,000 characters is accepted and 2,001 is rejected', async () => {
    const testCase = startCase('TC_PAGES_PATCH_037', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse275 = await sendRequest({
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
      const p = parentResponse275.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({
        properties: { Notes: { rich_text: [{ type: "text", text: { content: "x".repeat(2000) } }] } },
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
        expect(j.url).to.include("notion.so");
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
      check("2000 characters should be stored", () => {
        expect(val(j.properties.Notes).length).to.eql(2000);
      });
      const r = await send("PATCH", `${pagesPath}/${id}`, {
        properties: { Notes: { rich_text: [{ type: "text", text: { content: "x".repeat(2001) } }] } },
      });
      check("2001 characters should return 400", () => {
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

  it('TC_PAGES_PATCH_038 - [Boundary] Verify that a rich text array of 100 elements is accepted and 101 is rejected', async () => {
    const testCase = startCase('TC_PAGES_PATCH_038', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse276 = await sendRequest({
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
      const p = parentResponse276.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({
        properties: {
          Notes: { rich_text: Array.from({ length: 100 }, () => ({ type: "text", text: { content: "a" } })) },
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
        expect(j.url).to.include("notion.so");
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
      const r = await send("PATCH", `${pagesPath}/${id}`, {
        properties: {
          Notes: { rich_text: Array.from({ length: 101 }, () => ({ type: "text", text: { content: "a" } })) },
        },
      });
      check("101 elements should return 400", () => {
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

  it('TC_PAGES_PATCH_039 - [Boundary] Verify that list properties accept 100 items and reject 101', async () => {
    const testCase = startCase('TC_PAGES_PATCH_039', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse277 = await sendRequest({
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
      const p = parentResponse277.json().id;
      cv.set("parentPageId", p);
      const f = await fullRow(p);
      cv.set("extra", JSON.stringify({ u: f.userId, r: f.relRow.id }));
      setBody({
        properties: { Tags: { multi_select: Array.from({ length: 100 }, (_: any, i: any) => ({ name: "o" + i })) } },
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
        expect(j.url).to.include("notion.so");
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
      const x = JSON.parse(cv.get("extra"));
      const a = await send("PATCH", `${pagesPath}/${id}`, {
        properties: { Tags: { multi_select: Array.from({ length: 101 }, (_: any, i: any) => ({ name: "q" + i })) } },
      });
      check("101 multi_select items should return 400", () => {
        expect(a.code, "status").to.eql(400);
        expect(a.json.object).to.eql("error");
        expect(a.json.code).to.eql("validation_error");
      });
      const b = await send("PATCH", `${pagesPath}/${id}`, {
        properties: { Related: { relation: Array.from({ length: 101 }, () => ({ id: x.r })) } },
      });
      check("101 relation items should return 400", () => {
        expect(b.code, "status").to.eql(400);
        expect(b.json.object).to.eql("error");
        expect(b.json.code).to.eql("validation_error");
      });
      const c = await send("PATCH", `${pagesPath}/${id}`, {
        properties: { Who: { people: Array.from({ length: 101 }, () => ({ id: x.u })) } },
      });
      check("101 people items should return 400", () => {
        expect(c.code, "status").to.eql(400);
        expect(c.json.object).to.eql("error");
        expect(c.json.code).to.eql("validation_error");
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

  it('TC_PAGES_PATCH_040 - [Boundary] Verify that a url property accepts 2,000 characters and rejects 2,001', async () => {
    const testCase = startCase('TC_PAGES_PATCH_040', {
      method: 'PATCH',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse278 = await sendRequest({
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
      const p = parentResponse278.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      setBody({ properties: { Link: { url: "https://example.com/" + "a".repeat(1980) } } });
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
        expect(j.url).to.include("notion.so");
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
      const r = await send("PATCH", `${pagesPath}/${id}`, {
        properties: { Link: { url: "https://example.com/" + "a".repeat(1981) } },
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
});
