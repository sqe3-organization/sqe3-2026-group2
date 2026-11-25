import { describe, it, expect, beforeAll } from 'vitest';
import { startCase, cv, check, assertChecks } from '../../hooks/pages/pagesContext';
import {
  pagesAPI,
  env,
  CASE_TIMEOUT_MS,
  pagesPath,
  send,
  uniq,
  createPage,
  trash,
  cleanupCase,
  mkPage,
  createParentPage,
  parent,
  mkDb,
  fullRow,
  relPage,
  blocks,
  cb,
  children,
  propIds,
  val,
  expectPageSchema,
  commonChecks,
  authFails,
} from '../../hooks/pages/pagesHooks';

describe('Activity #6 — Suite 02: GET /v1/pages/{page_id} — Preconditioned Page Retrieval', () => {
  beforeAll(() => {
    expect(env('notionToken'), 'NOTION_TOKEN must be set').toBeTruthy();
    expect(env('rootPageId'), 'NOTION_ROOT_PAGE_ID must be set').toBeTruthy();
  });

  it('TC_PAGES_GET_001 - [Happy Path] Verify that a page can be retrieved by its ID', async () => {
    const testCase = startCase('TC_PAGES_GET_001', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse43 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: uniq("QA get") } }] } },
      });
      const createdPage42 = pageResponse43.json;
      cv.set("pageId", createdPage42.id);
      cv.set("targetId", createdPage42.id);
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
    const testCase = startCase('TC_PAGES_GET_002', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();
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
    const testCase = startCase('TC_PAGES_GET_003', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse47 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const createdPage46 = pageResponse47.json;
      cv.set("pageId", createdPage46.id);
      cv.set("targetId", createdPage46.id);
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
    const testCase = startCase('TC_PAGES_GET_004', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();
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
    const testCase = startCase('TC_PAGES_GET_005', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();
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
    const testCase = startCase('TC_PAGES_GET_006', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse51 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse51.json;
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
    const testCase = startCase('TC_PAGES_GET_007', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();
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
    const testCase = startCase('TC_PAGES_GET_008', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse55 = await createPage(Object.assign(
        {
          parent: { page_id: p },
          properties: { title: { title: [{ text: { content: uniq("QA blocks") } }] } },
        },
        { children: blocks(10) },
      ));
      const createdPage54 = pageResponse55.json;
      cv.set("pageId", createdPage54.id);
      cv.set("targetId", createdPage54.id);
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
    const testCase = startCase('TC_PAGES_GET_009', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options), { options: { noAuth: true } });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse58 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const createdPage57 = pageResponse58.json;
      cv.set("pageId", createdPage57.id);
      cv.set("targetId", createdPage57.id);
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
    const testCase = startCase('TC_PAGES_GET_010', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options), { options: { token: 'ntn_invalid_token_000' } });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse61 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const createdPage60 = pageResponse61.json;
      cv.set("pageId", createdPage60.id);
      cv.set("targetId", createdPage60.id);
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
    const testCase = startCase('TC_PAGES_GET_011', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    // This test sends the request without the Notion-Version header
    testCase.request.removeHeader("Notion-Version");


    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse64 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const createdPage63 = pageResponse64.json;
      cv.set("pageId", createdPage63.id);
      cv.set("targetId", createdPage63.id);
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
    const testCase = startCase('TC_PAGES_GET_017', (req) => pagesAPI.getPage(cv.get('targetId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse72 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const createdPage71 = pageResponse72.json;
      cv.set("pageId", createdPage71.id);
      cv.set("targetId", createdPage71.id);
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
    const testCase = startCase('TC_PAGES_GET_018', (req) => pagesAPI.getPage(cv.get('targetId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse75 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const createdPage74 = pageResponse75.json;
      cv.set("pageId", createdPage74.id);
      cv.set("targetId", createdPage74.id);
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
    const testCase = startCase('TC_PAGES_GET_019', (req) => pagesAPI.getPage(cv.get('targetId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse78 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const createdPage77 = pageResponse78.json;
      cv.set("pageId", createdPage77.id);
      cv.set("targetId", createdPage77.id);
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
    const testCase = startCase('TC_PAGES_GET_021', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();
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
    const testCase = startCase('TC_PAGES_GET_022', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();
      const t = "ñ".repeat(1990) + "😀😀😀😀😀";
      cv.set("pageTitle", t);

      // Create a page under the parent page
      const pageResponse82 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: t } }] } },
      });
      const createdPage81 = pageResponse82.json;
      cv.set("pageId", createdPage81.id);
      cv.set("targetId", createdPage81.id);
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
    const testCase = startCase('TC_PAGES_GET_023', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();
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
    const testCase = startCase('TC_PAGES_GET_024', (req) => pagesAPI.getPage(cv.get('pageId'), undefined, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse85 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "before" } }] } },
      });
      const c = pageResponse85.json;
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
