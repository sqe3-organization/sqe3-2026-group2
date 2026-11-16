/**
 * Activity #6 — Suite 03: GET /v1/pages/{page_id}/properties/{property_id} — Preconditioned Property Items
 * Migrated from Notion_Pages.postman_collection.json (folder "GET /v1/pages/{page_id}/properties/{property_id}").
 * 22 preconditioned test cases. Each case builds its own data by API, runs the request under test,
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
  mkPage,
  parent,
  mkDb,
  fullRow,
  basicRow,
  relPage,
  dual,
  cb,
  allItems,
  propIds,
  authFails
} from '../../src/pages/pagesKit.js';
import { expectPropertyItemSchema } from '../../src/pages/pageSchemas.js';

describe('Activity #6 — Suite 03: GET /v1/pages/{page_id}/properties/{property_id} — Preconditioned Property Items', () => {
  beforeAll(() => {
    expect(env('notionToken'), 'NOTION_TOKEN must be set').toBeTruthy();
    expect(env('rootPageId'), 'NOTION_ROOT_PAGE_ID must be set').toBeTruthy();
  });

  it('TC_PAGES_PROP_001 - [Happy Path] Verify that simple property types can be retrieved as property_item', async () => {
    const testCase = startCase('TC_PAGES_PROP_001', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse89 = await sendRequest({
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
      const p = parentResponse89.json().id;
      cv.set("parentPageId", p);
      await fullRow(p);
      const m = await propIds(cv.get("pageId"));
      cv.set("propId", m.Count);
      cv.set("extra", JSON.stringify(m));
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
      check("object should be property_item", () => {
        expect(j.object).to.eql("property_item");
      });
      check("type should be number", () => {
        expect(j.type).to.eql("number");
      });
      check("number should be 42", () => {
        expect(j.number).to.eql(42);
      });
      check("Response schema should be valid", () => {
        expectPropertyItemSchema(j);
      });
      const m = JSON.parse(cv.get("extra"));
      const types: any = {
        Count: "number",
        Done: "checkbox",
        Choice: "select",
        When: "date",
        Link: "url",
        Mail: "email",
        Phone: "phone_number",
        CreatedAt: "created_time",
        EditedAt: "last_edited_time",
        Formula: "formula",
      };
      for (const k of Object.keys(types)) {
        const r = await send("GET", `${pagesPath}/${id}/properties/${m[k]}`, null);
        check(k + " should return 200", () => {
          expect(r.code, "status").to.eql(200);
        });
        check(k + " object should be property_item", () => {
          expect(r.json.object).to.eql("property_item");
        });
        check(k + " type should be " + types[k], () => {
          expect(r.json.type).to.eql(types[k]);
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

  it('TC_PAGES_PROP_002 - [Happy Path] Verify that paginated property types are returned as a list', async () => {
    const testCase = startCase('TC_PAGES_PROP_002', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse90 = await sendRequest({
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
      const p = parentResponse90.json().id;
      cv.set("parentPageId", p);
      await fullRow(p);
      const m = await propIds(cv.get("pageId"));
      cv.set("propId", m.Name);
      cv.set("extra", JSON.stringify(m));
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
      check("Response should be a paginated property list", () => {
        expect(j.object).to.eql("list");
        expect(j.results).to.be.an("array");
        expect(j.has_more).to.be.a("boolean");
        expect(j).to.have.property("next_cursor");
        expect(j.type).to.eql("property_item");
        expect(j.property_item).to.be.an("object");
      });
      const m = JSON.parse(cv.get("extra"));
      for (const k of ["Notes", "Related", "Rollup", "Who"]) {
        const r = await send("GET", `${pagesPath}/${id}/properties/${m[k]}`, null);
        check(k + " should return 200", () => {
          expect(r.code, "status").to.eql(200);
        });
        check(k + " should be a list", () => {
          expect(r.json.object).to.eql("list");
        });
        check(k + " list type should be property_item", () => {
          expect(r.json.type).to.eql("property_item");
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

  it('TC_PAGES_PROP_003 - [Happy Path] Verify that a relation with more than 25 references can be read completely through next_cursor', async () => {
    const testCase = startCase('TC_PAGES_PROP_003', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}?{{qs}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse91 = await sendRequest({
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
      const p = parentResponse91.json().id;
      cv.set("parentPageId", p);
      const r = await relPage(p, 30);
      cv.set("propId", r.propId);
      cv.set("qs", "page_size=10");
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
      check("The first page should have 10 items", () => {
        expect(j.results.length).to.eql(10);
      });
      check("has_more should be true", () => {
        expect(j.has_more).to.eql(true);
      });
      const all = await allItems(id, cv.get("propId"), 10);
      check("30 references should be returned in total", () => {
        expect(all.items.length).to.eql(30);
      });
      check("There should be no duplicates", () => {
        expect(new Set(all.items.map((x: any) => x.relation.id)).size).to.eql(30);
      });
      check("Three pages of 10 expected", () => {
        expect(all.pages).to.eql(3);
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

  it('TC_PAGES_PROP_004 - [Happy Path] Verify that formula properties return the correct result type', async () => {
    const testCase = startCase('TC_PAGES_PROP_004', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse92 = await sendRequest({
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
      const p = parentResponse92.json().id;
      cv.set("parentPageId", p);
      const d = await mkDb(p, { Name: { title: {} }, Count: { number: {} } });
      await send("PATCH", "/v1/data_sources/" + d.ds, {
        properties: {
          Fstr: { formula: { expression: 'concat("a","b")' } },
          Fnum: { formula: { expression: "1 + 1" } },
          Fbool: { formula: { expression: "true" } },
          Fdate: { formula: { expression: "now()" } },
        },
      });
      const r = await mkPage(
        { type: "data_source_id", data_source_id: d.ds },
        { Name: { title: [{ type: "text", text: { content: "f" } }] }, Count: { number: 1 } },
      );
      cv.set("pageId", r.id);
      const m = await propIds(r.id);
      cv.set("propId", m.Fnum);
      cv.set("extra", JSON.stringify(m));
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
      check("Formula type should be number", () => {
        expect(j.formula.type).to.eql("number");
      });
      check("Formula value should be 2", () => {
        expect(j.formula.number).to.eql(2);
      });
      const m = JSON.parse(cv.get("extra"));
      const s = await send("GET", `${pagesPath}/${id}/properties/${m.Fstr}`, null);
      check("String formula type", () => {
        expect(s.json.formula.type).to.eql("string");
      });
      check("String formula value", () => {
        expect(s.json.formula.string).to.eql("ab");
      });
      const b = await send("GET", `${pagesPath}/${id}/properties/${m.Fbool}`, null);
      check("Boolean formula type", () => {
        expect(b.json.formula.type).to.eql("boolean");
      });
      check("Boolean formula value", () => {
        expect(b.json.formula.boolean).to.eql(true);
      });
      const d = await send("GET", `${pagesPath}/${id}/properties/${m.Fdate}`, null);
      check("Date formula type", () => {
        expect(d.json.formula.type).to.eql("date");
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

  it('TC_PAGES_PROP_005 - [Happy Path] Verify that files, multi_select, created_by and last_edited_by properties have the documented shape', async () => {
    const testCase = startCase('TC_PAGES_PROP_005', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse93 = await sendRequest({
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
      const p = parentResponse93.json().id;
      cv.set("parentPageId", p);
      await fullRow(p);
      const m = await propIds(cv.get("pageId"));
      cv.set("propId", m.Tags);
      cv.set("extra", JSON.stringify(m));
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
      check("type should be multi_select", () => {
        expect(j.type).to.eql("multi_select");
      });
      check("multi_select values", () => {
        expect(j.multi_select.map((o: any) => o.name)).to.eql(["A", "B"]);
      });
      const m = JSON.parse(cv.get("extra"));
      const pg = await send("GET", `${pagesPath}/${id}`, null);
      for (const k of ["Files", "CreatedBy", "EditedBy"]) {
        const r = await send("GET", `${pagesPath}/${id}/properties/${m[k]}`, null);
        check(k + " should return 200", () => {
          expect(r.code, "status").to.eql(200);
        });
        check(k + " type should match Retrieve a page", () => {
          expect(r.json.type).to.eql(pg.json.properties[k].type);
        });
      }
      const f = await send("GET", `${pagesPath}/${id}/properties/${m.Files}`, null);
      check("files should contain f.png", () => {
        expect(f.json.files.map((x: any) => x.name)).to.eql(["f.png"]);
      });
      const cb = await send("GET", `${pagesPath}/${id}/properties/${m.CreatedBy}`, null);
      check("created_by should be a user", () => {
        expect(cb.json.created_by.object).to.eql("user");
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

  it('TC_PAGES_PROP_006 - [Happy Path] Verify that a property ID with special characters works when URL-encoded', async () => {
    const testCase = startCase('TC_PAGES_PROP_006', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse94 = await sendRequest({
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
      const p = parentResponse94.json().id;
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
      check("The property should be returned using its URL-encoded ID", () => {
        expect(j.number).to.eql(42);
      });
      check("The returned id should match the requested ID", () =>
        expect(decodeURIComponent(j.id)).to.eql(decodeURIComponent(cv.get("propId"))),
      );
      const t = await send("GET", `${pagesPath}/${id}/properties/${"title"}`, null);
      check("The title property should be addressable by id", () => {
        expect(t.code, "status").to.eql(200);
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

  it('TC_PAGES_PROP_007 - [Happy Path] Verify that a rollup over a relation with many pages returns the computed value', async () => {
    const testCase = startCase('TC_PAGES_PROP_007', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse95 = await sendRequest({
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
      const p = parentResponse95.json().id;
      cv.set("parentPageId", p);
      const d = await dual(p, 30);
      cv.set("propId", d.totalId);
      cv.set("extra", String(d.sum));
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
      const ro = j.property_item ? j.property_item.rollup : j.rollup;
      check("The rollup sum should equal the sum of the 30 related tasks", () => {
        expect(ro.number).to.eql(Number(cv.get("extra")));
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

  it('TC_PAGES_PROP_008 - [Negative] Verify that a request without the Authorization header is rejected with 401', async () => {
    const testCase = startCase('TC_PAGES_PROP_008', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/title',
      body: '',
      headers: {},
      auth: { type: 'noauth' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse96 = await sendRequest({
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
      const p = parentResponse96.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse98 = await sendRequest({
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
      const unused97 = pageResponse98.json();
      cv.set("pageId", unused97.id);
      cv.set("targetId", unused97.id);
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

  it('TC_PAGES_PROP_009 - [Negative] Verify that invalid, expired and wrong-scheme credentials are rejected with 401', async () => {
    const testCase = startCase('TC_PAGES_PROP_009', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/title',
      body: '',
      headers: {},
      auth: { type: 'bearer', token: 'ntn_invalid_token_000' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse99 = await sendRequest({
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
      const p = parentResponse99.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse101 = await sendRequest({
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
      const unused100 = pageResponse101.json();
      cv.set("pageId", unused100.id);
      cv.set("targetId", unused100.id);
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
      await authFails("GET", "/v1/pages/" + id + "/properties/title");
      if (env("revokedToken")) {
        const r = await send("GET", "/v1/pages/" + id + "/properties/title", null, {
          token: env("revokedToken"),
        });
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

  it('TC_PAGES_PROP_013 - [Negative] Verify that a property that does not exist on the page returns 404', async () => {
    const testCase = startCase('TC_PAGES_PROP_013', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/zzzz',
      body: '',
      headers: {},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse105 = await sendRequest({
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
      const p = parentResponse105.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse107 = await sendRequest({
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
      const unused106 = pageResponse107.json();
      cv.set("pageId", unused106.id);
      cv.set("targetId", unused106.id);
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

  it('TC_PAGES_PROP_014 - [Negative] Verify that a property ID from another data source is rejected', async () => {
    const testCase = startCase('TC_PAGES_PROP_014', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}',
      body: '',
      headers: {},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse108 = await sendRequest({
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
      const p = parentResponse108.json().id;
      cv.set("parentPageId", p);
      const a = await basicRow(p);
      const b = await basicRow(p);
      const pb = await propIds(b.row.id);
      cv.set("pageId", a.row.id);
      cv.set("propId", pb.Count);
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

  it('TC_PAGES_PROP_018 - [Negative] Verify that a start_cursor from another property or page is rejected', async () => {
    const testCase = startCase('TC_PAGES_PROP_018', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/title?{{qs}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse116 = await sendRequest({
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
      const p = parentResponse116.json().id;
      cv.set("parentPageId", p);
      const r = await relPage(p, 12);
      const c = await send(
        "GET",
        `${pagesPath}/${r.row.id}/properties/${r.propId}` + "?page_size=5",
        null,
      );
      cv.set("qs", "start_cursor=" + c.json.next_cursor);
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

  it('TC_PAGES_PROP_019 - [Negative] Verify that the rate limit returns 429 with a Retry-After header', async () => {
    const testCase = startCase('TC_PAGES_PROP_019', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/title',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse117 = await sendRequest({
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
      const p = parentResponse117.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse119 = await sendRequest({
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
      const unused118 = pageResponse119.json();
      cv.set("pageId", unused118.id);
      cv.set("targetId", unused118.id);
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

  it('TC_PAGES_PROP_020 - [Boundary] Verify that page_size=1 returns one item per response', async () => {
    const testCase = startCase('TC_PAGES_PROP_020', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}?{{qs}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse120 = await sendRequest({
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
      const p = parentResponse120.json().id;
      cv.set("parentPageId", p);
      const r = await relPage(p, 5);
      cv.set("propId", r.propId);
      cv.set("qs", "page_size=1");
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
      check("Exactly one item expected", () => {
        expect(j.results.length).to.eql(1);
      });
      check("has_more should be true", () => {
        expect(j.has_more).to.eql(true);
      });
      check("next_cursor should not be null", () => {
        expect(!!j.next_cursor).to.be.true;
      });
      const all = await allItems(id, cv.get("propId"), 1);
      check("Five items in total", () => {
        expect(all.items.length).to.eql(5);
      });
      check("Five pages of one item", () => {
        expect(all.pages).to.eql(5);
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

  it('TC_PAGES_PROP_021 - [Boundary] Verify that page_size=100 returns up to 100 items', async () => {
    const testCase = startCase('TC_PAGES_PROP_021', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}?{{qs}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse121 = await sendRequest({
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
      const p = parentResponse121.json().id;
      cv.set("parentPageId", p);
      const d = await dual(p, 101);
      cv.set("propId", d.revId);
      cv.set("qs", "page_size=100");
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
      check("100 items expected", () => {
        expect(j.results.length).to.eql(100);
      });
      check("has_more should be true", () => {
        expect(j.has_more).to.eql(true);
      });
      const all = await allItems(id, cv.get("propId"), 100);
      check("101 items in total", () => {
        expect(all.items.length).to.eql(101);
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

  it('TC_PAGES_PROP_024 - [Boundary] Verify that non-numeric and negative page_size values are rejected', async () => {
    const testCase = startCase('TC_PAGES_PROP_024', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}?{{qs}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse124 = await sendRequest({
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
      const p = parentResponse124.json().id;
      cv.set("parentPageId", p);
      const r = await relPage(p, 30);
      cv.set("propId", r.propId);
      cv.set("qs", "page_size=abc");
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

  it('TC_PAGES_PROP_025 - [Boundary] Verify that the default page_size of 100 is applied when it is omitted', async () => {
    const testCase = startCase('TC_PAGES_PROP_025', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse125 = await sendRequest({
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
      const p = parentResponse125.json().id;
      cv.set("parentPageId", p);
      const d = await dual(p, 101);
      cv.set("propId", d.revId);
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
      check("The default page size of 100 should be applied", () => {
        expect(j.results.length).to.eql(100);
      });
      check("has_more should be true", () => {
        expect(j.has_more).to.eql(true);
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

  it('TC_PAGES_PROP_026 - [Boundary] Verify that has_more is false at exactly page_size items and true at page_size plus one', async () => {
    const testCase = startCase('TC_PAGES_PROP_026', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}?{{qs}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse126 = await sendRequest({
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
      const p = parentResponse126.json().id;
      cv.set("parentPageId", p);
      const a = await relPage(p, 5);
      cv.set("otherId", a.row.id);
      cv.set("extra", a.propId);
      const b = await relPage(p, 6);
      cv.set("propId", b.propId);
      cv.set("qs", "page_size=5");
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
      check("5 items on the first page", () => {
        expect(j.results.length).to.eql(5);
      });
      check("6 items: has_more should be true", () => {
        expect(j.has_more).to.eql(true);
      });
      const nx = await send(
        "GET",
        `${pagesPath}/${id}/properties/${cv.get("propId")}` +
          ("page_size=5&start_cursor=" + j.next_cursor
            ? "?" + "page_size=5&start_cursor=" + j.next_cursor
            : ""),
        null,
      );
      check("The next page should have 1 item", () => {
        expect(nx.json.results.length).to.eql(1);
      });
      const five = await send(
        "GET",
        `${pagesPath}/${cv.get("otherId")}/properties/${cv.get("extra")}` +
          "?page_size=5",
        null,
      );
      check("5 items: has_more should be false", () => {
        expect(five.json.has_more).to.eql(false);
      });
      check("5 items: next_cursor should be null", () => {
        expect(five.json.next_cursor).to.eql(null);
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

  it('TC_PAGES_PROP_027 - [Boundary] Verify that an empty paginated property returns an empty results list', async () => {
    const testCase = startCase('TC_PAGES_PROP_027', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse127 = await sendRequest({
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
      const p = parentResponse127.json().id;
      cv.set("parentPageId", p);
      const rel = await mkDb(p, { Name: { title: {} } });
      const m = await mkDb(p, {
        Name: { title: {} },
        Related: { relation: { data_source_id: rel.ds, single_property: {} } },
      });
      const r = await mkPage(
        { type: "data_source_id", data_source_id: m.ds },
        { Name: { title: [{ type: "text", text: { content: "empty" } }] } },
      );
      cv.set("pageId", r.id);
      cv.set("propId", r.properties.Related.id);
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
      check("results should be empty", () => {
        expect(j.results).to.eql([]);
      });
      check("has_more should be false", () => {
        expect(j.has_more).to.eql(false);
      });
      check("next_cursor should be null", () => {
        expect(j.next_cursor).to.eql(null);
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

  it('TC_PAGES_PROP_028 - [Boundary] Verify that the page ID is accepted with hyphens and as 32-character hex', async () => {
    const testCase = startCase('TC_PAGES_PROP_028', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/title',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse128 = await sendRequest({
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
      const p = parentResponse128.json().id;
      cv.set("parentPageId", p);

      // Create a page under the parent page
      const pageResponse130 = await sendRequest({
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
      const unused129 = pageResponse130.json();
      cv.set("pageId", unused129.id);
      cv.set("targetId", unused129.id);
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
      const r = await send("GET", `${pagesPath}/${String(id).replace(/-/g, "")}/properties/${"title"}`, null);
      check("The 32-character page ID should be accepted", () => {
        expect(r.code, "status").to.eql(200);
      });
      check("Both forms should return the same item", () => {
        expect(r.json.results[0].id).to.eql(j.results[0].id);
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

  it('TC_PAGES_PROP_029 - [Happy Path] Verify that a property value matches the value returned by Retrieve a page', async () => {
    const testCase = startCase('TC_PAGES_PROP_029', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse131 = await sendRequest({
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
      const p = parentResponse131.json().id;
      cv.set("parentPageId", p);
      await fullRow(p);
      const m = await propIds(cv.get("pageId"));
      cv.set("propId", m.Count);
      cv.set("extra", JSON.stringify(m));
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
      const m = JSON.parse(cv.get("extra"));
      const pg = await send("GET", `${pagesPath}/${id}`, null);
      for (const k of ["Count", "Done", "Choice", "Link", "Mail", "Phone", "When"]) {
        const t = pg.json.properties[k].type;
        const r = await send("GET", `${pagesPath}/${id}/properties/${m[k]}`, null);
        check(k + " should match Retrieve a page", () => {
          expect(r.json[t]).to.eql(pg.json.properties[k][t]);
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

  it('TC_PAGES_PROP_030 - [Happy Path] Verify that a property value reflects the latest update', async () => {
    const testCase = startCase('TC_PAGES_PROP_030', {
      method: 'GET',
      url: '{{apiBaseURL}}{{pagesEndpoint}}/{{pageId}}/properties/{{propId}}',
      body: '{}',
      headers: {'Content-Type': 'application/json'},
      auth: { type: 'bearer', token: '{{notionToken}}' },
    });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const parentResponse132 = await sendRequest({
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
      const p = parentResponse132.json().id;
      cv.set("parentPageId", p);
      const b = await basicRow(p);
      const m = await propIds(b.row.id);
      cv.set("propId", m.Count);
      await send("PATCH", `${pagesPath}/${b.row.id}`, { properties: { Count: { number: 99 } } });
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
      check("The property should reflect the latest update", () => {
        expect(j.number).to.eql(99);
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
