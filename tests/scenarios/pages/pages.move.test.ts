import { describe, it, expect, beforeAll } from 'vitest';
import { startCase, cv, check, assertChecks, setBody, track } from '../../hooks/pages/pagesContext';
import {
  pagesAPI,
  env,
  CASE_TIMEOUT_MS,
  pagesPath,
  sleep,
  send,
  pool,
  burst,
  waitFor,
  uniq,
  uuid,
  UUID,
  BAD_UUIDS,
  createPage,
  move,
  trash,
  cleanupCase,
  mkPage,
  createParentPage,
  parent,
  mkDb,
  dsBasic,
  fullRow,
  tree,
  blk,
  blocks,
  children,
  childPages,
  childCount,
  inQuery,
  val,
  commonChecks,
  authFails,
  child,
} from '../../hooks/pages/pagesHooks';

describe('Activity #6 — Suite 04: POST /v1/pages/{page_id}/move — Preconditioned Page Moves', () => {
  beforeAll(() => {
    expect(env('notionToken'), 'NOTION_TOKEN must be set').toBeTruthy();
    expect(env('rootPageId'), 'NOTION_ROOT_PAGE_ID must be set').toBeTruthy();
  });

  it('TC_PAGES_MOVE_001 - [Happy Path] Verify that a page can be moved under another page', async () => {
    const testCase = startCase('TC_PAGES_MOVE_001', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse134 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse134.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse135 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse135.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({ parent: { type: "page_id", page_id: p2 } });
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
      check("Response should be a page", () => expect(j.object).to.eql("page"));
      check("parent.type should be page_id", () => {
        expect(j.parent.type).to.eql("page_id");
      });
      check("The new parent should be the destination", () => {
        expect(String(j.parent.page_id).replace(/-/g, "")).to.eql(String(p2).replace(/-/g, ""));
      });
      const g = await send("GET", `${pagesPath}/${id}`, null);
      check("[Data integrity] GET should show the new parent", () => {
        expect(String(g.json.parent.page_id).replace(/-/g, "")).to.eql(String(p2).replace(/-/g, ""));
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

  it('TC_PAGES_MOVE_002 - [Happy Path] Verify that a page can be moved into a data source', async () => {
    const testCase = startCase('TC_PAGES_MOVE_002', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse137 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse137.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      const d = await dsBasic(p);
      setBody({ parent: { type: "data_source_id", data_source_id: d.ds } });
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
      check("Response should be a page", () => expect(j.object).to.eql("page"));
      check("parent.type should be data_source_id", () => {
        expect(j.parent.type).to.eql("data_source_id");
      });
      check("The data source should be the new parent", () => {
        expect(j.parent.data_source_id).to.eql(cv.get("dsId"));
      });
      {
        const condition = await inQuery(cv.get("dsId"), id);
        check("[Data integrity] The page should be a row of the data source", () => {
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

  it('TC_PAGES_MOVE_003 - [Happy Path] Verify that a row can be moved out of a data source to a page', async () => {
    const testCase = startCase('TC_PAGES_MOVE_003', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse139 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse139.json.id;
      cv.set("parent2Id", p2);
      await fullRow(p);
      setBody({ parent: { type: "page_id", page_id: p2 } });
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
      check("Response should be a page", () => expect(j.object).to.eql("page"));
      check("parent.type should be page_id", () => {
        expect(j.parent.type).to.eql("page_id");
      });
      check("Only title should remain", () => {
        expect(Object.keys(j.properties)).to.eql(["title"]);
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

  it('TC_PAGES_MOVE_004 - [Happy Path] Verify that id, url, creator, icon, cover and blocks stay unchanged after a move', async () => {
    const testCase = startCase('TC_PAGES_MOVE_004', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse141 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse141.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse142 = await createPage(Object.assign(
        { parent: { page_id: p }, properties: { title: { title: [{ text: { content: uniq("mv") } }] } } },
        {
          icon: { type: "emoji", emoji: "📝" },
          cover: { type: "external", external: { url: "https://example.com/c.png" } },
          children: blocks(10),
        },
      ));
      const c = pageResponse142.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);

      const g = await send("GET", `${pagesPath}/${c.id}`, null);
      cv.set(
        "snap",
        JSON.stringify({
          url: g.json.url,
          created_time: g.json.created_time,
          created_by: g.json.created_by.id,
          icon: g.json.icon,
          cover: g.json.cover,
          lt: g.json.last_edited_time,
        }),
      );
      setBody({ parent: { type: "page_id", page_id: p2 } });
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
      check("Response should be a page", () => expect(j.object).to.eql("page"));
      const s = JSON.parse(cv.get("snap"));
      check("id should be unchanged", () => {
        expect(j.id).to.eql(id);
      });
      check("url should be unchanged", () => {
        expect(j.url).to.eql(s.url);
      });
      check("created_time should be unchanged", () => {
        expect(j.created_time).to.eql(s.created_time);
      });
      check("created_by should be unchanged", () => {
        expect(j.created_by.id).to.eql(s.created_by);
      });
      check("icon should be unchanged", () => {
        expect(j.icon).to.eql(s.icon);
      });
      check("cover should be unchanged", () => {
        expect(j.cover).to.eql(s.cover);
      });
      check("last_edited_time should be updated", () => {
        expect(!!(new Date(j.last_edited_time) >= new Date(s.lt))).to.be.true;
      });
      {
        const actual = (await children(id)).length;
        const expected = 10;
        check("[Data integrity] The 10 blocks should be unchanged", () => {
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

  it('TC_PAGES_MOVE_005 - [Happy Path] Verify that child pages move together with the page', async () => {
    const testCase = startCase('TC_PAGES_MOVE_005', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse144 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse144.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse145 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse145.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      const k1 = await mkPage(
        { page_id: c.id },
        { title: { title: [{ type: "text", text: { content: "k1" } }] } },
      );
      const k2 = await mkPage(
        { page_id: c.id },
        { title: { title: [{ type: "text", text: { content: "k2" } }] } },
      );
      cv.set("extra", JSON.stringify([k1.id, k2.id]));
      setBody({ parent: { type: "page_id", page_id: p2 } });
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
      check("Response should be a page", () => expect(j.object).to.eql("page"));
      for (const k of JSON.parse(cv.get("extra"))) {
        const g = await send("GET", `${pagesPath}/${k}`, null);
        check("[Data integrity] The child page should still be accessible", () => {
          expect(g.code, "status").to.eql(200);
        });
        check("[Data integrity] The child should keep the moved page as parent", () => {
          expect(String(g.json.parent.page_id).replace(/-/g, "")).to.eql(String(id).replace(/-/g, ""));
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

  it('TC_PAGES_MOVE_006 - [Happy Path] Verify that the old parent no longer lists the moved page', async () => {
    const testCase = startCase('TC_PAGES_MOVE_006', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse147 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse147.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse148 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse148.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({ parent: { type: "page_id", page_id: p2 } });
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
      check("Response should be a page", () => expect(j.object).to.eql("page"));
      {
        const condition = await waitFor(async () => (await childCount(p)) === 0);
        check("[Data integrity] The old parent should not list the page", () => {
          expect(!!condition).to.be.true;
        });
      }
      {
        const condition = await waitFor(async () =>
          (await childPages(p2)).some((b: any) => String(b.id).replace(/-/g, "") === String(id).replace(/-/g, "")),
        );
        check("[Data integrity] The new parent should list the page", () => {
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

  it('TC_PAGES_MOVE_007 - [Happy Path] Verify that a page moved into a data source keeps its title and other properties are empty', async () => {
    const testCase = startCase('TC_PAGES_MOVE_007', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse150 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "Mv" } }] } },
      });
      const c = pageResponse150.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      const d = await dsBasic(p);
      setBody({ parent: { type: "data_source_id", data_source_id: d.ds } });
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
      check("Response should be a page", () => expect(j.object).to.eql("page"));
      check("The title should be kept", () => {
        expect(val(j.properties.Name)).to.eql("Mv");
      });
      check("Count should be empty", () => {
        expect(j.properties.Count.number).to.eql(null);
      });
      check("Tags should be empty", () => {
        expect(val(j.properties.Tags)).to.eql([]);
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

  it('TC_PAGES_MOVE_008 - [Happy Path] Verify that a row can be moved between data sources with different schemas', async () => {
    const testCase = startCase('TC_PAGES_MOVE_008', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();
      const f = await fullRow(p);
      const b = await mkDb(p, {
        Name: { title: {} },
        Count: { number: {} },
        Notes: { number: {} },
        Extra: { checkbox: {} },
      });
      setBody({ parent: { type: "data_source_id", data_source_id: b.ds } });
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
      check("Response should be a page", () => expect(j.object).to.eql("page"));
      check("The destination data source should be the parent", () => {
        expect(j.parent.data_source_id).to.eql(cv.get("dsId"));
      });
      check("Count (same name and type) should be kept", () => {
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

  it('TC_PAGES_MOVE_009 - [Negative] Verify that a request without the Authorization header is rejected with 401', async () => {
    const testCase = startCase('TC_PAGES_MOVE_009', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options), { options: { noAuth: true } });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse153 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse153.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse154 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse154.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({ parent: { type: "page_id", page_id: p2 } });
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

  it('TC_PAGES_MOVE_010 - [Negative] Verify that invalid, expired and wrong-scheme credentials are rejected with 401', async () => {
    const testCase = startCase('TC_PAGES_MOVE_010', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options), { options: { token: 'ntn_invalid_token_000' } });

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse156 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse156.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse157 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse157.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({ parent: { type: "page_id", page_id: p2 } });
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
      await authFails("POST", "/v1/pages/" + id + "/move", { parent: { type: "page_id", page_id: p2 } });
      if (env("revokedToken")) {
        const r = await send(
          "POST",
          "/v1/pages/" + id + "/move",
          { parent: { type: "page_id", page_id: p2 } },
          { token: env("revokedToken") },
        );
        check("Revoked or expired token should return 401", () => {
          expect(r.code, "status").to.eql(401);
          expect(r.json.object).to.eql("error");
          expect(r.json.code).to.eql("unauthorized");
        });
      }
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

  it('TC_PAGES_MOVE_011 - [Negative] Verify that a request without the Notion-Version header is rejected with missing_version', async () => {
    const testCase = startCase('TC_PAGES_MOVE_011', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    // This test sends the request without the Notion-Version header
    testCase.request.removeHeader("Notion-Version");


    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse159 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse159.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse160 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse160.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({ parent: { type: "page_id", page_id: p2 } });
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

  it('TC_PAGES_MOVE_012 - [Negative] Verify that an empty or malformed body is rejected', async () => {
    const testCase = startCase('TC_PAGES_MOVE_012', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse162 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse162.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse163 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse163.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
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
      for (const b of ["", "null"]) {
        const r = await send("POST", "/v1/pages/" + id + "/move", b);
        check('Body "' + b + '" should return 400', () => {
          expect([400]).to.include(r.code);
        });
      }
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

  it('TC_PAGES_MOVE_013 - [Negative] Verify that a missing or empty parent is rejected with validation_error', async () => {
    const testCase = startCase('TC_PAGES_MOVE_013', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse165 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse165.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse166 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse166.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({});
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
      for (const b of [{ parent: {} }, { parent: null }]) {
        const r = await send("POST", "/v1/pages/" + id + "/move", b);
        check("Body " + JSON.stringify(b) + " should return 400", () => {
          expect(r.code, "status").to.eql(400);
          expect(r.json.object).to.eql("error");
          expect(r.json.code).to.eql("validation_error");
        });
      }
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

  it('TC_PAGES_MOVE_014 - [Negative] Verify that a database_id parent is rejected with validation_error', async () => {
    const testCase = startCase('TC_PAGES_MOVE_014', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse168 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse168.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      const d = await dsBasic(p);
      setBody({ parent: { type: "database_id", database_id: d.db } });
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

  it('TC_PAGES_MOVE_015 - [Negative] Verify that workspace and block_id parent types are rejected', async () => {
    const testCase = startCase('TC_PAGES_MOVE_015', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse170 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse170.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse171 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse171.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({ parent: { type: "workspace", workspace: true } });
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
      const bs = await send("POST", "/v1/pages/" + id + "/move", {
        parent: { type: "block_id", block_id: uuid() },
      });
      check("block_id parent should return 400", () => {
        expect(bs.code, "status").to.eql(400);
        expect(bs.json.object).to.eql("error");
        expect(bs.json.code).to.eql("validation_error");
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

  it('TC_PAGES_MOVE_016 - [Negative] Verify that an invalid destination UUID is rejected with validation_error', async () => {
    const testCase = startCase('TC_PAGES_MOVE_016', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse173 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse173.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse174 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse174.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({ parent: { type: "page_id", page_id: "abc" } });
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
      for (const x of BAD_UUIDS) {
        const r = await send("POST", "/v1/pages/" + id + "/move", { parent: { type: "page_id", page_id: x } });
        check("Destination " + x.slice(0, 12) + " should return 400", () => {
          expect(r.code, "status").to.eql(400);
          expect(r.json.object).to.eql("error");
          expect(r.json.code).to.eql("validation_error");
        });
      }
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

  it('TC_PAGES_MOVE_017 - [Negative] Verify that an invalid source page UUID is rejected with validation_error', async () => {
    const testCase = startCase('TC_PAGES_MOVE_017', (req) => pagesAPI.movePage('not-a-uuid', req.body, req.options));

    // PRECONDITIONS
    try {
      // Create a second parent page under the root page shared with the integration
      const secondParentResponse175 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse175.json.id;
      cv.set("parent2Id", p2);
      setBody({ parent: { type: "page_id", page_id: p2 } });
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

  it('TC_PAGES_MOVE_020 - [Negative] Verify that a source page that does not exist or is not shared returns object_not_found', async () => {
    const testCase = startCase('TC_PAGES_MOVE_020', (req) => pagesAPI.movePage(cv.get('targetId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create a second parent page under the root page shared with the integration
      const secondParentResponse182 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse182.json.id;
      cv.set("parent2Id", p2);
      cv.set("targetId", uuid());
      setBody({ parent: { type: "page_id", page_id: p2 } });
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
      check("Status code should be 404", () => {
        expect(res.status).to.eql(404);
      });
      check("Response body should be a Notion error with code object_not_found", () => {
        const errorBody = res.data;
        expect(errorBody.object).to.eql("error");
        expect(errorBody.status).to.eql(404);
        expect(errorBody.code).to.eql("object_not_found");
        expect(errorBody.message).to.be.a("string").and.not.empty;
      });
      if (env("unsharedPageId")) {
        const u = await send("POST", "/v1/pages/" + env("unsharedPageId") + "/move", {
          parent: { type: "page_id", page_id: cv.get("parent2Id") },
        });
        check("Unshared source should return the same 404", () => {
          const noIds = (s: any) =>
            String(s).replace(/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/g, "ID");
          expect({ code: res.status, json: j }.code).to.eql(u.code);
          expect({ code: res.status, json: j }.json.code).to.eql(u.json.code);
          expect(noIds({ code: res.status, json: j }.json.message)).to.eql(noIds(u.json.message));
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

  it('TC_PAGES_MOVE_021 - [Negative] Verify that a page cannot be moved into itself', async () => {
    const testCase = startCase('TC_PAGES_MOVE_021', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse184 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse184.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse185 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse185.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({ parent: { type: "page_id", page_id: c.id } });
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

  it('TC_PAGES_MOVE_022 - [Negative] Verify that a page cannot be moved into one of its descendants', async () => {
    const testCase = startCase('TC_PAGES_MOVE_022', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();
      const t = await tree(p, 2, 1);
      cv.set("pageId", t.top);
      cv.set("extra", JSON.stringify(t.all));
      setBody({ parent: { type: "page_id", page_id: t.all[1].id } });
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
      const all = JSON.parse(cv.get("extra"));
      const r = await send("POST", "/v1/pages/" + id + "/move", {
        parent: { type: "page_id", page_id: all[2].id },
      });
      check("Moving into a grandchild should return 400", () => {
        expect([400]).to.include(r.code);
      });
      for (const x of all) {
        const g = await send("GET", `${pagesPath}/${x.id}`, null);
        check("[Data integrity] " + x.id.slice(0, 8) + " should keep its parent", () => {
          expect(String(g.json.parent.page_id).replace(/-/g, "")).to.eql(String(x.parent).replace(/-/g, ""));
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

  it('TC_PAGES_MOVE_023 - [Negative] Verify that a page in the trash cannot be moved', async () => {
    const testCase = startCase('TC_PAGES_MOVE_023', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse188 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse188.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse189 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse189.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      await send("PATCH", `${pagesPath}/${c.id}`, { in_trash: true });
      setBody({ parent: { type: "page_id", page_id: p2 } });
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

  it('TC_PAGES_MOVE_024 - [Negative] Verify that a page cannot be moved into a destination that is in the trash', async () => {
    const testCase = startCase('TC_PAGES_MOVE_024', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse191 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse191.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse192 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse192.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      await send("PATCH", `${pagesPath}/${p2}`, { in_trash: true });
      setBody({ parent: { type: "page_id", page_id: p2 } });
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

  it('TC_PAGES_MOVE_027 - [Negative] Verify that a non-page block cannot be used as page parent', async () => {
    const testCase = startCase('TC_PAGES_MOVE_027', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a page under the parent page
      const pageResponse200 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse200.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);

      // Create a page under the parent page
      const pageResponse201 = await createPage(Object.assign(
        { parent: { page_id: p }, properties: { title: { title: [{ text: { content: "b" } }] } } },
        { children: [blk("paragraph", "x")] },
      ));
      const b = pageResponse201.json;
      cv.set("pageId", b.id);
      cv.set("targetId", b.id);
      const bs = await children(b.id);
      cv.set("pageId", c.id);
      cv.set("blockId", bs[0].id);
      setBody({ parent: { type: "page_id", page_id: bs[0].id } });
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

  it('TC_PAGES_MOVE_029 - [Boundary] Verify that the destination ID is accepted with hyphens and as 32-character hex', async () => {
    const testCase = startCase('TC_PAGES_MOVE_029', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse206 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse206.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse207 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const a = pageResponse207.json;
      cv.set("pageId", a.id);
      cv.set("targetId", a.id);

      // Create a page under the parent page
      const pageResponse208 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const b = pageResponse208.json;
      cv.set("pageId", b.id);
      cv.set("targetId", b.id);
      cv.set("otherId", b.id);
      cv.set("pageId", a.id);
      setBody({ parent: { type: "page_id", page_id: p2 } });
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
      check("Response should be a page", () => expect(j.object).to.eql("page"));
      const r = await send("POST", `${pagesPath}/${cv.get("otherId")}/move`, {
        parent: { type: "page_id", page_id: String(p2).replace(/-/g, "") },
      });
      check("The 32-character destination ID should be accepted", () => {
        expect(r.code, "status").to.eql(200);
      });
      check("Both pages should end under the same parent", () => {
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

  it('TC_PAGES_MOVE_030 - [Boundary] Verify that an empty string as destination ID is rejected with validation_error', async () => {
    const testCase = startCase('TC_PAGES_MOVE_030', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse210 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse210.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse211 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse211.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({ parent: { type: "page_id", page_id: "" } });
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
      const r = await send("POST", "/v1/pages/" + id + "/move", {
        parent: { type: "data_source_id", data_source_id: "" },
      });
      check("Empty data_source_id should return 400", () => {
        expect(r.code, "status").to.eql(400);
        expect(r.json.object).to.eql("error");
        expect(r.json.code).to.eql("validation_error");
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

  it('TC_PAGES_MOVE_031 - [Boundary] Verify that moving a page to its current parent is handled as documented', async () => {
    const testCase = startCase('TC_PAGES_MOVE_031', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse213 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse213.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse214 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse214.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      setBody({ parent: { type: "page_id", page_id: p } });
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
      {
        const actual = await childCount(p);
        const expected = 1;
        check("[Data integrity] No duplicate should be created", () => {
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

  it('TC_PAGES_MOVE_033 - [Boundary] Verify that a hierarchy of about 50 pages moves without losing descendants', async () => {
    const testCase = startCase('TC_PAGES_MOVE_033', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse219 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse219.json.id;
      cv.set("parent2Id", p2);
      const t = await tree(p, 2, 6);
      cv.set("pageId", t.top);
      cv.set("extra", JSON.stringify(t.all));
      setBody({ parent: { type: "page_id", page_id: p2 } });
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
      check("Response should be a page", () => expect(j.object).to.eql("page"));
      const all = JSON.parse(cv.get("extra"));
      const rs = await pool(all.length, async (i: any) =>
        send("GET", `${pagesPath}/${all[i].id}`, null, { fast: true }),
      );
      check("[Data integrity] Every page of the hierarchy should be retrievable", () => {
        expect(rs.filter((r: any) => r.code === 200).length).to.eql(all.length);
      });
      check("[Data integrity] The top page should be under the new parent", () => {
        expect(String(rs[0].json.parent.page_id).replace(/-/g, "")).to.eql(String(p2).replace(/-/g, ""));
      });
      check("[Data integrity] Descendants should keep their parents", () => {
        expect(
          rs
            .slice(1)
            .filter(
              (r: any, i: any) =>
                String(r.json.parent.page_id).replace(/-/g, "") === String(all[i + 1].parent).replace(/-/g, ""),
            ).length,
        ).to.eql(all.length - 1);
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

  it('TC_PAGES_MOVE_034 - [Boundary] Verify that two parallel moves of the same page leave it in exactly one parent', async () => {
    const testCase = startCase('TC_PAGES_MOVE_034', (req) => pagesAPI.movePage(cv.get('pageId'), req.body, req.options));

    // PRECONDITIONS
    try {
      // Create the parent page under the root page shared with the integration
      const p = await createParentPage();

      // Create a second parent page under the root page shared with the integration
      const secondParentResponse221 = await createPage({
        parent: { page_id: env("rootPageId") },
        properties: { title: { title: [{ text: { content: "QA parent 2 - " + Date.now() } }] } },
      });
      const p2 = secondParentResponse221.json.id;
      cv.set("parent2Id", p2);

      // Create a page under the parent page
      const pageResponse222 = await createPage({
        parent: { page_id: p },
        properties: { title: { title: [{ text: { content: "QA page - " + Date.now() } }] } },
      });
      const c = pageResponse222.json;
      cv.set("pageId", c.id);
      cv.set("targetId", c.id);
      const p3 = await mkPage(
        { page_id: env("rootPageId") },
        { title: { title: [{ type: "text", text: { content: uniq("QA parent3") } }] } },
      );
      track(p3.id);
      cv.set("otherId", p3.id);
      setBody({ parent: { type: "page_id", page_id: p2 } });
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
      check("Response should be a page", () => expect(j.object).to.eql("page"));
      const p3 = cv.get("otherId");
      const rs = await burst(2, (i: any) =>
        send(
          "POST",
          `${pagesPath}/${id}/move`,
          { parent: { type: "page_id", page_id: i === 0 ? p3 : p } },
          { fast: true },
        ),
      );
      rs.forEach((r: any, i: any) =>
        check("Parallel move " + (i + 1) + " should return 200 or 409", () => {
          expect([200, 409]).to.include(r.code);
        }),
      );
      await sleep(2000);
      const g = await send("GET", `${pagesPath}/${id}`, null);
      check("[Data integrity] The page should end in one of the two parents", () => {
        expect(
          !![String(p3).replace(/-/g, ""), String(p).replace(/-/g, "")].includes(
            String(g.json.parent.page_id).replace(/-/g, ""),
          ),
        ).to.be.true;
      });
      {
        const condition = await waitFor(async () => (await childCount(p3)) + (await childCount(p)) === 1);
        check("[Data integrity] The page should be listed in exactly one parent", () => {
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
});
