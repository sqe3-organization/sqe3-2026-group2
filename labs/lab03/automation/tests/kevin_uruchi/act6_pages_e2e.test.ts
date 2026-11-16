/**
 * Activity #6 — Suite 06: Chained Multi-Step E2E Workflows (Pages Module)
 * TC_E2E_001 to TC_E2E_016 of the Pages test case document (KevinUruchiTests.md).
 * Every flow is a describe block whose steps share state. The pages the flow creates
 * are moved to the trash in afterAll, even when a step fails.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  CASE_TIMEOUT_MS,
  assertChecks,
  beginStep,
  blk,
  blocks,
  burst,
  cb,
  check,
  child,
  childCount,
  childPages,
  children,
  chk,
  chkIn,
  cleanupCase,
  cv,
  DSP,
  dsBasic,
  dual,
  env,
  eq,
  fullPrep,
  fullRow,
  getp,
  allItems,
  mkDb,
  mkPage,
  move,
  nodash,
  notInQuery,
  inQuery,
  ok,
  pageOk,
  parent,
  parent2,
  PARENT,
  patch,
  pool,
  prop,
  query,
  send,
  sleep,
  startFlow,
  stepOk,
  tp,
  track,
  trash,
  tree,
  uniq,
  userIds,
  val,
  waitFor,
  basicRow,
} from '../../src/pages/pagesKit.js';

const T = CASE_TIMEOUT_MS;
type Flow = ReturnType<typeof startFlow>;

// Every flow gets its own context and moves its pages to the trash at the end
function useFlow(id: string) {
  const holder: { flow: Flow } = { flow: null as unknown as Flow };
  beforeAll(() => {
    expect(env('notionToken'), 'NOTION_TOKEN must be set').toBeTruthy();
    expect(env('rootPageId'), 'NOTION_ROOT_PAGE_ID must be set').toBeTruthy();
    holder.flow = startFlow(id);
  });
  afterAll(async () => {
    await cleanupCase(holder.flow);
  }, T);
  return holder;
}

const titleOf = (page: any) => val(page.properties.title ?? page.properties.Name);

describe('Activity #6 — Suite 06: Chained E2E Workflows (Pages)', () => {
  // ==========================================================================
  // TC_E2E_001 — Create a row with every property type and read it back
  // ==========================================================================
  describe('TC_E2E_001 — Full lifecycle of a data source row: create and read', () => {
    const h = useFlow('TC_E2E_001');
    const s: { p: string; ds: string; props: any; expected: Record<string, any>; rowId: string } = {
      p: '', ds: '', props: {}, expected: {}, rowId: '',
    };

    it('TC_E2E_001_Step1 - Create a database whose data source has every writable property type', async () => {
      beginStep(h.flow, 'TC_E2E_001_Step1');
      s.p = await parent();
      const f = await fullPrep(s.p);
      s.ds = f.d.ds;
      s.props = f.fp.props;
      s.expected = f.fp.expected;
      ok(s.ds, 'The data source should be created');
      check('The expected values should cover every writable type', () =>
        expect(Object.keys(s.expected).length).to.be.at.least(11)
      );
      assertChecks();
    }, T);

    it('TC_E2E_001_Step2 - POST /v1/pages with all properties and compare the response with the request', async () => {
      beginStep(h.flow, 'TC_E2E_001_Step2');
      const r = await send('POST', '/v1/pages', { parent: DSP(s.ds), properties: s.props });
      stepOk(r, 200, 'Create');
      pageOk(r.json, 'Create');
      s.rowId = r.json?.id;
      track(s.rowId);
      for (const k of Object.keys(s.expected))
        eq(val(r.json?.properties[k]), s.expected[k], `[Create] Property ${k} should match the value sent`);
      assertChecks();
    }, T);

    it('TC_E2E_001_Step3 - GET /v1/pages/{id} and compare each value with the request (data integrity)', async () => {
      beginStep(h.flow, 'TC_E2E_001_Step3');
      const g = await getp(s.rowId);
      stepOk(g, 200, 'GET');
      pageOk(g.json, 'GET');
      eq(g.json?.id, s.rowId, '[Data integrity] GET id should match');
      for (const k of Object.keys(s.expected))
        eq(val(g.json?.properties[k]), s.expected[k], `[Data integrity] GET property ${k} should match the value sent`);
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_002 + TC_E2E_003 — Update, read through both GET endpoints, query
  // ==========================================================================
  describe('TC_E2E_002 / TC_E2E_003 — Update properties, verify both GET endpoints and query the new values', () => {
    const h = useFlow('TC_E2E_002');
    const s = { rowId: '', ds: '', before: '', ids: {} as Record<string, string> };
    const filter = {
      filter: {
        and: [
          { property: 'Count', number: { equals: 77 } },
          { property: 'Choice', select: { equals: 'Opt2' } },
          { property: 'When', date: { equals: '2026-12-01' } },
        ],
      },
    };

    it('TC_E2E_002_Step1 - Create a full row and snapshot last_edited_time', async () => {
      beginStep(h.flow, 'TC_E2E_002_Step1');
      const p = await parent();
      const f = await fullRow(p);
      s.rowId = f.row.id;
      s.ds = f.ds;
      const g = await getp(s.rowId);
      stepOk(g, 200, 'GET before the update');
      s.before = g.json?.last_edited_time;
      assertChecks();
    }, T);

    it('TC_E2E_002_Step2 - PATCH number, select and date', async () => {
      beginStep(h.flow, 'TC_E2E_002_Step2');
      const u = await patch(s.rowId, {
        properties: { Count: { number: 77 }, Choice: { select: { name: 'Opt2' } }, When: { date: { start: '2026-12-01' } } },
      });
      stepOk(u, 200, 'PATCH');
      pageOk(u.json, 'PATCH');
      s.ids = { Count: u.json?.properties?.Count?.id, Choice: u.json?.properties?.Choice?.id, When: u.json?.properties?.When?.id };
      ok(new Date(u.json?.last_edited_time) >= new Date(s.before), 'last_edited_time should not go back');
      assertChecks();
    }, T);

    it('TC_E2E_002_Step3 - GET /v1/pages/{id} returns the new values', async () => {
      beginStep(h.flow, 'TC_E2E_002_Step3');
      const g = await getp(s.rowId);
      stepOk(g, 200, 'GET');
      eq(g.json?.properties?.Count?.number, 77, '[Data integrity] GET Count');
      eq(g.json?.properties?.Choice?.select?.name, 'Opt2', '[Data integrity] GET Choice');
      eq(g.json?.properties?.When?.date?.start, '2026-12-01', '[Data integrity] GET When');
      assertChecks();
    }, T);

    it('TC_E2E_002_Step4 - GET /v1/pages/{id}/properties/{property_id} returns the new values', async () => {
      beginStep(h.flow, 'TC_E2E_002_Step4');
      const a = await prop(s.rowId, s.ids.Count);
      stepOk(a, 200, 'Property item Count');
      eq(a.json?.number, 77, '[Data integrity] Property item Count');
      const b = await prop(s.rowId, s.ids.Choice);
      stepOk(b, 200, 'Property item Choice');
      eq(b.json?.select?.name, 'Opt2', '[Data integrity] Property item Choice');
      const c = await prop(s.rowId, s.ids.When);
      stepOk(c, 200, 'Property item When');
      eq(c.json?.date?.start, '2026-12-01', '[Data integrity] Property item When');
      assertChecks();
    }, T);

    it('TC_E2E_003_Step1 - Query the data source with a filter on the three updated values', async () => {
      beginStep(h.flow, 'TC_E2E_003_Step1');
      const first = await send('POST', `/v1/data_sources/${s.ds}/query`, filter);
      stepOk(first, 200, 'Query');
      check('Query response should be a list', () => {
        expect(first.json?.object).to.eql('list');
        expect(first.json?.results).to.be.an('array');
      });
      let rs: any[] = [];
      const found = await waitFor(
        async () => {
          rs = (await query(s.ds, filter)).results;
          return rs.length === 1 && rs[0].id === s.rowId;
        },
        10,
        2000
      );
      ok(found, '[Data integrity] The query should return exactly the updated page (allowing for the indexing delay)');
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_004 — Trash and restore without data loss
  // ==========================================================================
  describe('TC_E2E_004 — Trash and restore without data loss', () => {
    const h = useFlow('TC_E2E_004');
    const s = { rowId: '', ds: '', expected: {} as Record<string, any> };

    it('TC_E2E_004_Step1 - Create a row with known properties and 3 blocks', async () => {
      beginStep(h.flow, 'TC_E2E_004_Step1');
      const p = await parent();
      const f = await fullRow(p);
      s.rowId = f.row.id;
      s.ds = f.ds;
      s.expected = f.expected;
      const a = await send('PATCH', `/v1/blocks/${s.rowId}/children`, { children: blocks(3) });
      stepOk(a, 200, 'Append 3 blocks');
      assertChecks();
    }, T);

    it('TC_E2E_004_Step2 - PATCH in_trash true, GET the page and check it is absent from the query', async () => {
      beginStep(h.flow, 'TC_E2E_004_Step2');
      const r = await patch(s.rowId, { in_trash: true });
      stepOk(r, 200, '[Trash] PATCH');
      eq(r.json?.in_trash, true, '[Trash] in_trash should be true');
      const g = await getp(s.rowId);
      stepOk(g, 200, '[Trash] GET');
      eq(g.json?.in_trash, true, '[Trash] GET in_trash should be true');
      ok(await notInQuery(s.ds, s.rowId), '[Trash] The page should not appear in the query');
      assertChecks();
    }, T);

    it('TC_E2E_004_Step3 - PATCH in_trash false and compare properties, blocks and query with the snapshot', async () => {
      beginStep(h.flow, 'TC_E2E_004_Step3');
      const r = await patch(s.rowId, { in_trash: false });
      stepOk(r, 200, '[Restore] PATCH');
      eq(r.json?.in_trash, false, '[Restore] in_trash should be false');
      const g = await getp(s.rowId);
      eq(g.json?.in_trash, false, '[Restore] GET in_trash should be false');
      for (const k of Object.keys(s.expected))
        eq(val(g.json?.properties[k]), s.expected[k], `[Data integrity] Property ${k} should be identical after restore`);
      eq((await children(s.rowId)).length, 3, '[Data integrity] The 3 blocks should be intact');
      ok(await inQuery(s.ds, s.rowId), '[Restore] The page should be back in the query');
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_005 — Hierarchy: parent, child and blocks
  // ==========================================================================
  describe('TC_E2E_005 — Hierarchy: parent, child and blocks', () => {
    const h = useFlow('TC_E2E_005');
    const s = { p: '', c: '' };
    const txt = (b: any) => b.paragraph.rich_text.map((t: any) => t.plain_text).join('');

    it('TC_E2E_005_Step1 - Create a parent page and a child page with 3 blocks', async () => {
      beginStep(h.flow, 'TC_E2E_005_Step1');
      s.p = await parent();
      const r = await send('POST', '/v1/pages', cb(s.p, { children: blocks(3) }));
      stepOk(r, 200, 'Create child');
      pageOk(r.json, 'Create child');
      s.c = r.json?.id;
      track(s.c);
      eq((await children(s.c)).length, 3, 'The child page should have 3 blocks');
      assertChecks();
    }, T);

    it('TC_E2E_005_Step2 - Append 2 blocks with PATCH /v1/blocks/{child}/children', async () => {
      beginStep(h.flow, 'TC_E2E_005_Step2');
      const ap = await send('PATCH', `/v1/blocks/${s.c}/children`, {
        children: [blk('paragraph', 'n1'), blk('paragraph', 'n2')],
      });
      stepOk(ap, 200, 'Append blocks');
      assertChecks();
    }, T);

    it('TC_E2E_005_Step3 - PATCH the child title, icon and cover', async () => {
      beginStep(h.flow, 'TC_E2E_005_Step3');
      const up = await patch(s.c, {
        properties: { title: tp('Renamed child') },
        icon: { type: 'emoji', emoji: '📝' },
        cover: { type: 'external', external: { url: 'https://example.com/cover.png' } },
      });
      stepOk(up, 200, 'Update child');
      pageOk(up.json, 'Update child');
      assertChecks();
    }, T);

    it('TC_E2E_005_Step4 - GET both pages and list the blocks in order', async () => {
      beginStep(h.flow, 'TC_E2E_005_Step4');
      const g = await getp(s.c);
      stepOk(g, 200, 'GET child');
      eq(titleOf(g.json), 'Renamed child', '[Data integrity] Child title');
      eq(g.json?.icon?.emoji, '📝', '[Data integrity] Child icon');
      eq(g.json?.cover?.external?.url, 'https://example.com/cover.png', '[Data integrity] Child cover');
      eq((await children(s.c)).map(txt), ['p1', 'p2', 'p3', 'n1', 'n2'], '[Data integrity] The 5 blocks should be in order');
      const gp = await getp(s.p);
      stepOk(gp, 200, 'GET parent');
      eq(gp.json?.in_trash, false, '[Data integrity] The parent should be unchanged');
      eq(await childCount(s.p), 1, '[Data integrity] The parent should still have one child page');
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_006 — Move through every parent type
  // ==========================================================================
  describe('TC_E2E_006 — Move through every parent type', () => {
    const h = useFlow('TC_E2E_006');
    const s: any = { p: '', p2: '', dsA: '', dsB: '', id: '', snap: {}, prev: '', title: '' };

    const verifyAfterMove = async (step: number, type: string, parentId: string) => {
      const g = await getp(s.id);
      stepOk(g, 200, `GET after move ${step}`);
      const t = g.json?.parent?.type;
      eq(t, type, `Move ${step} parent.type`);
      eq(nodash(g.json?.parent[t]), nodash(parentId), `Move ${step} parent id`);
      eq(g.json?.id, s.id, '[Data integrity] id never changes');
      eq(g.json?.url, s.snap.url, '[Data integrity] url never changes');
      eq(g.json?.created_by?.id, s.snap.cb, '[Data integrity] created_by never changes');
      eq(g.json?.icon, s.snap.icon, '[Data integrity] icon never changes');
      eq(g.json?.cover, s.snap.cover, '[Data integrity] cover never changes');
      eq((await children(s.id)).length, 2, '[Data integrity] blocks never change');
      ok(new Date(g.json?.last_edited_time) >= new Date(s.prev), 'last_edited_time should not go back');
      eq(titleOf(g.json), s.title, `The title should be kept after move ${step}`);
      s.prev = g.json?.last_edited_time;
      return g.json;
    };

    it('TC_E2E_006_Step1 - Create two parent pages, two data sources and a page under parent A', async () => {
      beginStep(h.flow, 'TC_E2E_006_Step1');
      s.p = await parent();
      s.p2 = await parent2();
      s.dsA = (await dsBasic(s.p)).ds;
      s.dsB = (await mkDb(s.p, { Name: { title: {} }, Count: { number: {} }, Extra: { checkbox: {} } })).ds;
      const body = cb(s.p, {
        icon: { type: 'emoji', emoji: '📝' },
        cover: { type: 'external', external: { url: 'https://example.com/c.png' } },
        children: blocks(2),
      });
      s.title = cv.get('pageTitle');
      const r = await send('POST', '/v1/pages', body);
      stepOk(r, 200, 'Create');
      pageOk(r.json, 'Create');
      s.id = r.json?.id;
      track(s.id);
      s.snap = { url: r.json?.url, cb: r.json?.created_by?.id, icon: r.json?.icon, cover: r.json?.cover };
      s.prev = r.json?.last_edited_time;
      assertChecks();
    }, T);

    it('TC_E2E_006_Step2 - Move to parent B', async () => {
      beginStep(h.flow, 'TC_E2E_006_Step2');
      stepOk(await move(s.id, PARENT(s.p2)), 200, 'Move 1');
      await verifyAfterMove(1, 'page_id', s.p2);
      assertChecks();
    }, T);

    it('TC_E2E_006_Step3 - Move to data source A', async () => {
      beginStep(h.flow, 'TC_E2E_006_Step3');
      stepOk(await move(s.id, DSP(s.dsA)), 200, 'Move 2');
      await verifyAfterMove(2, 'data_source_id', s.dsA);
      assertChecks();
    }, T);

    it('TC_E2E_006_Step4 - Set Count and move to data source B with a different schema', async () => {
      beginStep(h.flow, 'TC_E2E_006_Step4');
      stepOk(await patch(s.id, { properties: { Count: { number: 5 } } }), 200, 'Setting Count before the move');
      stepOk(await move(s.id, DSP(s.dsB)), 200, 'Move 3');
      const g = await verifyAfterMove(3, 'data_source_id', s.dsB);
      eq(g.properties?.Count?.number, 5, 'Count (same name and type) should be kept in the second data source');
      assertChecks();
    }, T);

    it('TC_E2E_006_Step5 - Move back to parent A and keep only title', async () => {
      beginStep(h.flow, 'TC_E2E_006_Step5');
      stepOk(await move(s.id, PARENT(s.p)), 200, 'Move 4');
      const g = await verifyAfterMove(4, 'page_id', s.p);
      eq(Object.keys(g.properties), ['title'], 'Only title should remain on a page parent');
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_007 — Sub-tree moves intact and cycles are rejected
  // ==========================================================================
  describe('TC_E2E_007 — Sub-tree moves intact and cycles are rejected', () => {
    const h = useFlow('TC_E2E_007');
    const s: any = { p2: '', top: '', all: [] as Array<{ id: string; parent: string }>, before: '' };

    const readTree = async (tag: string) => {
      const rs = await pool(s.all.length, (i) => getp(s.all[i].id, { fast: true }));
      eq(rs.filter((r) => r.code === 200).length, s.all.length, `${tag} every page should be retrievable`);
      eq(
        rs.slice(1).filter((r, i) => nodash(r.json?.parent?.page_id) === nodash(s.all[i + 1].parent)).length,
        s.all.length - 1,
        `${tag} descendants should keep their parents`
      );
      return rs;
    };

    it('TC_E2E_007_Step1 - Create a page with 3 levels of descendants (2 per level)', async () => {
      beginStep(h.flow, 'TC_E2E_007_Step1');
      const p = await parent();
      s.p2 = await parent2();
      const t = await tree(p, 3, 2);
      s.top = t.top;
      s.all = t.all;
      eq(s.all.length, 15, 'The tree should have 15 pages (top + 14 descendants)');
      assertChecks();
    }, T);

    it('TC_E2E_007_Step2 - Move the top page to parent B and GET the 14 descendants', async () => {
      beginStep(h.flow, 'TC_E2E_007_Step2');
      const m = await move(s.top, PARENT(s.p2));
      stepOk(m, 200, 'Move the tree');
      pageOk(m.json, 'Move the tree');
      eq(nodash(m.json?.parent?.page_id), nodash(s.p2), 'The top page should be under the new parent');
      await readTree('[Data integrity]');
      s.before = (await getp(s.top)).json?.last_edited_time;
      assertChecks();
    }, T);

    it('TC_E2E_007_Step3 - Move the top page into one of its descendants (cycle) is rejected', async () => {
      beginStep(h.flow, 'TC_E2E_007_Step3');
      const cyc = await move(s.top, PARENT(s.all[s.all.length - 1].id));
      chkIn(cyc, [400], 'Moving the top page into a descendant should return 400');
      assertChecks();
    }, T);

    it('TC_E2E_007_Step4 - GET the tree again: hierarchy and last_edited_time unchanged', async () => {
      beginStep(h.flow, 'TC_E2E_007_Step4');
      const after = await readTree('[Data integrity] After the rejected move');
      eq(after[0].json?.last_edited_time, s.before, '[Data integrity] last_edited_time of the top page should be unchanged');
      eq(nodash(after[0].json?.parent?.page_id), nodash(s.p2), '[Data integrity] The top page should stay under the new parent');
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_008 — Dual relation across create, update, read and trash
  // ==========================================================================
  describe('TC_E2E_008 — Dual relation across create, update, read and trash', () => {
    const h = useFlow('TC_E2E_008');
    const s: any = { project: '', task: '', rev: '', revId: '', taskDs: '', p2: '', made: [] as any[] };
    const ids = (r: any[]) => (r || []).map((v) => nodash(v.id));
    const relationOf = async (pageId: string) => ids((await getp(pageId)).json?.properties?.[s.rev]?.relation);

    it('TC_E2E_008_Step1 - Create a project and a task related to it, then GET both pages', async () => {
      beginStep(h.flow, 'TC_E2E_008_Step1');
      const p = await parent();
      const d = await dual(p, 1);
      const pj2 = await mkPage(DSP(d.projDs), { Name: tp(uniq('project2')) });
      Object.assign(s, { project: d.project.id, task: d.tasks[0], rev: d.revName, revId: d.revId, taskDs: d.taskDs, p2: pj2.id });
      ok(s.rev, 'The project should expose the dual (reverse) relation property');
      ok(await waitFor(async () => (await relationOf(s.project)).includes(nodash(s.task))), 'The project should list the task');
      const t = await getp(s.task);
      stepOk(t, 200, 'GET task');
      ok(ids(t.json?.properties?.Project?.relation).includes(nodash(s.project)), 'The task should list the project');
      assertChecks();
    }, T);

    it('TC_E2E_008_Step2 - Create 30 more tasks and read the relation with page_size=10 following next_cursor', async () => {
      beginStep(h.flow, 'TC_E2E_008_Step2');
      s.made = await pool(30, (i) =>
        mkPage(DSP(s.taskDs), { Name: tp('bulk' + i), Project: { relation: [{ id: s.project }] } }, null, { fast: true })
      );
      eq(s.made.filter((m: any) => m.id).length, 30, '30 tasks should be created');
      let all: any = { items: [] };
      ok(
        await waitFor(
          async () => {
            all = await allItems(s.project, s.revId, 10);
            return all.items.length === 31;
          },
          6,
          2000
        ),
        'The relation property item should return 31 items following next_cursor'
      );
      eq(new Set(all.items.map((i: any) => i.relation?.id)).size, all.items.length, 'The 31 items should be distinct');
      assertChecks();
    }, T);

    it('TC_E2E_008_Step3 - PATCH one task to point to project 2 and read both relations', async () => {
      beginStep(h.flow, 'TC_E2E_008_Step3');
      const mv = await patch(s.task, { properties: { Project: { relation: [{ id: s.p2 }] } } });
      stepOk(mv, 200, 'Pointing the task to project 2');
      ok(await waitFor(async () => !(await relationOf(s.project)).includes(nodash(s.task))), 'Project 1 should lose the task');
      ok(await waitFor(async () => (await relationOf(s.p2)).includes(nodash(s.task))), 'Project 2 should gain the task');
      assertChecks();
    }, T);

    it('TC_E2E_008_Step4 - Send a task to the trash and read the project relation', async () => {
      beginStep(h.flow, 'TC_E2E_008_Step4');
      const tr = await trash(s.made[0].id);
      stepOk(tr, 200, 'Trashing a task');
      ok(
        await waitFor(async () => !(await relationOf(s.project)).includes(nodash(s.made[0].id))),
        'The trashed task should be removed from the project relation'
      );
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_009 — Computed properties stay correct and protected
  // ==========================================================================
  describe('TC_E2E_009 — Computed properties stay correct and protected', () => {
    const h = useFlow('TC_E2E_009');
    const s: any = { project: '', tasks: [] as string[], total: '', doubled: '' };
    const roll = async () => (await prop(s.project, s.total)).json;
    const form = async () => (await prop(s.project, s.doubled)).json;

    it('TC_E2E_009_Step1 - Create 5 tasks with 10, 20, 30, 40 and 50 related to one project', async () => {
      beginStep(h.flow, 'TC_E2E_009_Step1');
      const p = await parent();
      const d = await dual(p, 5);
      Object.assign(s, { project: d.project.id, tasks: d.tasks, total: d.totalId, doubled: d.doubledId });
      eq(d.sum, 150, 'The expected sum of the 5 tasks should be 150');
      ok(s.total && s.doubled, 'The rollup (Total) and the formula (Doubled) should exist');
      assertChecks();
    }, T);

    it('TC_E2E_009_Step2 - Read the rollup and formula with the property endpoint (150 and 300)', async () => {
      beginStep(h.flow, 'TC_E2E_009_Step2');
      ok(await waitFor(async () => (await roll())?.rollup?.number === 150, 10, 2000), 'Rollup should be 150');
      ok(await waitFor(async () => (await form())?.formula?.number === 300, 10, 2000), 'Formula should be 300');
      assertChecks();
    }, T);

    it('TC_E2E_009_Step3 - PATCH one task from 10 to 110 and poll for up to 60 seconds (250 and 500)', async () => {
      beginStep(h.flow, 'TC_E2E_009_Step3');
      stepOk(await patch(s.tasks[0], { properties: { Count: { number: 110 } } }), 200, 'Updating one task');
      ok(await waitFor(async () => (await roll())?.rollup?.number === 250, 20, 3000), 'Rollup should be 250 within 60 seconds');
      ok(await waitFor(async () => (await form())?.formula?.number === 500, 20, 3000), 'Formula should be 500 within 60 seconds');
      assertChecks();
    }, T);

    it('TC_E2E_009_Step4 - PATCH the rollup directly is rejected and the value is unchanged', async () => {
      beginStep(h.flow, 'TC_E2E_009_Step4');
      const bad = await patch(s.project, { properties: { Total: { rollup: { type: 'number', number: 400, function: 'sum' } } } });
      chk(bad, 400, 'validation_error', 'Updating the rollup directly should return 400');
      eq((await roll())?.rollup?.number, 250, '[Data integrity] The rollup value should be unchanged');
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_010 — Truncation and pagination consistency
  // ==========================================================================
  describe('TC_E2E_010 — Truncation and pagination consistency', () => {
    const h = useFlow('TC_E2E_010');
    const s: any = { id: '', pr: {}, users: [] as string[], text: '', full: null };

    it('TC_E2E_010_Step1 - Create a page with a rich_text of 2,000 characters in 100 segments and a people list', async () => {
      beginStep(h.flow, 'TC_E2E_010_Step1');
      const p = await parent();
      const d = await mkDb(p, { Name: { title: {} }, Notes: { rich_text: {} }, Who: { people: {} }, Count: { number: {} }, Done: { checkbox: {} } });
      s.users = (await userIds()).slice(0, 100);
      const segs = Array.from({ length: 100 }, (_, i) => ({ type: 'text', text: { content: String(i % 10).repeat(20) } }));
      s.text = segs.map((x) => x.text.content).join('');
      eq(s.text.length, 2000, 'The rich_text sent should have 2,000 characters');
      const r = await send('POST', '/v1/pages', {
        parent: DSP(d.ds),
        properties: {
          Name: tp(uniq('QA big')),
          Notes: { rich_text: segs },
          Who: { people: s.users.map((i: string) => ({ id: i })) },
          Count: { number: 3 },
          Done: { checkbox: true },
        },
      });
      stepOk(r, 200, 'Create');
      pageOk(r.json, 'Create');
      s.id = r.json?.id;
      s.pr = r.json?.properties ?? {};
      track(s.id);
      assertChecks();
    }, T);

    it('TC_E2E_010_Step2 - GET the page and read both properties following next_cursor', async () => {
      beginStep(h.flow, 'TC_E2E_010_Step2');
      const g = await getp(s.id);
      stepOk(g, 200, 'GET');
      s.full = g.json;
      const n = await allItems(s.id, s.pr.Notes?.id);
      eq(n.items.map((i: any) => i.rich_text?.plain_text).join(''), s.text, '[Data integrity] Concatenated paginated text should equal the text sent');
      const w = await allItems(s.id, s.pr.Who?.id, 10);
      eq(w.items.map((i: any) => i.people?.id).sort(), s.users.slice().sort(), '[Data integrity] All users should be returned through pagination');
      assertChecks();
    }, T);

    it('TC_E2E_010_Step3 - GET with filter_properties for 3 properties and read the omitted ones', async () => {
      beginStep(h.flow, 'TC_E2E_010_Step3');
      const qs = ['Name', 'Notes', 'Who'].map((k) => 'filter_properties=' + encodeURIComponent(s.pr[k]?.id)).join('&');
      const f = await send('GET', `/v1/pages/${s.id}?${qs}`);
      stepOk(f, 200, 'GET with filter_properties');
      eq(Object.keys(f.json?.properties ?? {}).sort(), ['Name', 'Notes', 'Who'], 'Only the 3 requested properties should be returned');
      const c = await prop(s.id, s.pr.Count?.id);
      eq(c.json?.number, s.full?.properties?.Count?.number, '[Data integrity] Omitted Count equals the unfiltered value');
      const d = await prop(s.id, s.pr.Done?.id);
      eq(d.json?.checkbox, s.full?.properties?.Done?.checkbox, '[Data integrity] Omitted Done equals the unfiltered value');
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_011 — Errors leave no side effects
  // ==========================================================================
  describe('TC_E2E_011 — Errors leave no side effects', () => {
    const h = useFlow('TC_E2E_011');
    const s: any = { p: '', title: '', id: '' };
    const find = async () => {
      const r = await send('POST', '/v1/search', { query: s.title, filter: { property: 'object', value: 'page' } });
      return ((r.json && r.json?.results) || []).filter((x: any) => val(x.properties?.title) === s.title);
    };

    it('TC_E2E_011_Step1 - Create with an invalid token is rejected and creates nothing', async () => {
      beginStep(h.flow, 'TC_E2E_011_Step1');
      s.p = await parent();
      const body = cb(s.p);
      s.title = cv.get('pageTitle');
      const r = await send('POST', '/v1/pages', body, { token: 'ntn_invalid_token_000' });
      chk(r, 401, 'unauthorized', 'Create with an invalid token should return 401');
      eq((await childPages(s.p)).length, 0, '[Data integrity] The failed create should not create a page');
      assertChecks();
    }, T);

    it('TC_E2E_011_Step2 - Resend with the valid token and search exactly one page with that title', async () => {
      beginStep(h.flow, 'TC_E2E_011_Step2');
      const r = await send('POST', '/v1/pages', { parent: { page_id: s.p }, properties: { title: tp(s.title) } });
      stepOk(r, 200, 'Resending with a valid token');
      s.id = r.json?.id;
      ok(await waitFor(async () => (await find()).length === 1), 'Search should find exactly one page with that title');
      assertChecks();
    }, T);

    it('TC_E2E_011_Step3 - Invalid block, invalid property and invalid destination are rejected', async () => {
      beginStep(h.flow, 'TC_E2E_011_Step3');
      const b1 = await send('POST', '/v1/pages', {
        parent: { page_id: s.p },
        properties: { title: tp(s.title + '-2') },
        children: [{ object: 'block', type: 'not_a_block', not_a_block: {} }],
      });
      chk(b1, 400, 'validation_error', 'Create with an invalid block should return 400');
      chk(await patch(s.id, { properties: { Bogus: { number: 1 } } }), 400, 'validation_error', 'Update with an invalid property should return 400');
      chk(await move(s.id, PARENT('abc')), 400, 'validation_error', 'Move to an invalid destination should return 400');
      assertChecks();
    }, T);

    it('TC_E2E_011_Step4 - GET the page and search: no new page, no changed property, no changed parent', async () => {
      beginStep(h.flow, 'TC_E2E_011_Step4');
      const g = await getp(s.id);
      stepOk(g, 200, 'GET');
      eq(val(g.json?.properties?.title), s.title, '[Data integrity] The title should be unchanged');
      eq(nodash(g.json?.parent?.page_id), nodash(s.p), '[Data integrity] The parent should be unchanged');
      eq(await childCount(s.p), 1, '[Data integrity] Only one page should exist under the parent');
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_012 — Rate limiting does not duplicate or lose operations
  // ==========================================================================
  describe('TC_E2E_012 — Rate limiting does not duplicate or lose operations', () => {
    const h = useFlow('TC_E2E_012');
    const s: any = { p: '', titles: [] as string[], rs: [] as any[] };

    it('TC_E2E_012_Step1 - Send 30 creates with unique titles in a burst', async () => {
      beginStep(h.flow, 'TC_E2E_012_Step1');
      s.p = await parent();
      s.titles = Array.from({ length: 30 }, (_, i) => uniq('burst' + i));
      s.rs = await burst(30, (i) =>
        send('POST', '/v1/pages', { parent: { page_id: s.p }, properties: { title: tp(s.titles[i]) } }, { fast: true, noRetry: true })
      );
      const limited = s.rs.filter((r: any) => r.code === 429);
      ok(limited.length >= 1, 'At least one 429 should appear in a burst of 30 creates');
      check('429 responses should have code rate_limited and Retry-After', () =>
        limited.forEach((r: any) => {
          expect(r.json?.code).to.eql('rate_limited');
          expect(r.headers.get('Retry-After')).to.not.be.null;
        })
      );
      assertChecks();
    }, T);

    it('TC_E2E_012_Step2 - On each 429 wait Retry-After and resend the same request', async () => {
      beginStep(h.flow, 'TC_E2E_012_Step2');
      for (let i = 0; i < 30; i++) {
        if (s.rs[i].code === 429) {
          const ra = parseFloat(s.rs[i].headers.get('Retry-After') ?? '') || 1;
          await sleep(ra * 1000 + 200);
          const r = await send('POST', '/v1/pages', { parent: { page_id: s.p }, properties: { title: tp(s.titles[i]) } });
          chk(r, 200, null, `Retry ${i} should return 200`);
        } else chk(s.rs[i], 200, null, `Create ${i} should return 200`);
      }
      assertChecks();
    }, T);

    it('TC_E2E_012_Step3 - Count pages by title: exactly 30, each title once', async () => {
      beginStep(h.flow, 'TC_E2E_012_Step3');
      await sleep(2000);
      const names = (await childPages(s.p)).map((b: any) => b.child_page.title);
      eq(names.length, 30, '[Data integrity] Exactly 30 pages should exist');
      s.titles.forEach((t: string, i: number) =>
        eq(names.filter((n: string) => n === t).length, 1, `[Data integrity] Title ${i} should exist exactly once`)
      );
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_013 — Permissions across the lifecycle
  // ==========================================================================
  describe('TC_E2E_013 — Permissions across the lifecycle', () => {
    const h = useFlow('TC_E2E_013');
    const s: any = { p: '', p2: '', id: '', title: '' };

    it('TC_E2E_013_Step1 - Create a page with integration A', async () => {
      beginStep(h.flow, 'TC_E2E_013_Step1');
      s.p = await parent();
      s.p2 = await parent2();
      const body = cb(s.p);
      s.title = cv.get('pageTitle');
      const r = await send('POST', '/v1/pages', body);
      stepOk(r, 200, 'Create with A');
      pageOk(r.json, 'Create with A');
      s.id = r.json?.id;
      track(s.id);
      assertChecks();
    }, T);

    it.skipIf(!env('tokenB'))('TC_E2E_013_Step2 - Integration B without access gets 404 on GET, property GET, PATCH and move', async () => {
      beginStep(h.flow, 'TC_E2E_013_Step2');
      const B = env('tokenB');
      chk(await send('GET', '/v1/pages/' + s.id, null, { token: B }), 404, 'object_not_found', 'B GET should return 404');
      chk(await send('GET', `/v1/pages/${s.id}/properties/title`, null, { token: B }), 404, 'object_not_found', 'B property GET should return 404');
      chk(await send('PATCH', '/v1/pages/' + s.id, { properties: { title: tp('x') } }, { token: B }), 404, 'object_not_found', 'B PATCH should return 404');
      chk(await move(s.id, PARENT(s.p2), { token: B }), 404, 'object_not_found', 'B move should return 404');
      assertChecks();
    }, T);

    it.skipIf(!env('tokenReadOnly'))('TC_E2E_013_Step3 - Read-only token: reads 200, writes 403 restricted_resource', async () => {
      beginStep(h.flow, 'TC_E2E_013_Step3');
      const R = env('tokenReadOnly');
      chk(await send('GET', '/v1/pages/' + s.id, null, { token: R }), 200, null, 'Read-only GET should return 200');
      chk(await send('GET', `/v1/pages/${s.id}/properties/title`, null, { token: R }), 200, null, 'Read-only property GET should return 200');
      chk(await send('POST', '/v1/pages', { parent: { page_id: s.p }, properties: { title: tp('ro') } }, { token: R }), 403, 'restricted_resource', 'Read-only create should return 403');
      chk(await send('PATCH', '/v1/pages/' + s.id, { properties: { title: tp('ro') } }, { token: R }), 403, 'restricted_resource', 'Read-only PATCH should return 403');
      chk(await move(s.id, PARENT(s.p2), { token: R }), 403, 'restricted_resource', 'Read-only move should return 403');
      assertChecks();
    }, T);

    it.skipIf(!env('tokenInsertOnly'))('TC_E2E_013_Step4 - Insert-only token: create 200, PATCH and move 403', async () => {
      beginStep(h.flow, 'TC_E2E_013_Step4');
      const I = env('tokenInsertOnly');
      const c = await send('POST', '/v1/pages', { parent: { page_id: s.p }, properties: { title: tp('ins') } }, { token: I });
      chk(c, 200, null, 'Insert-only create should return 200');
      if (c.json?.id) track(c.json?.id);
      chk(await send('PATCH', '/v1/pages/' + s.id, { properties: { title: tp('ins') } }, { token: I }), 403, 'restricted_resource', 'Insert-only PATCH should return 403');
      chk(await move(s.id, PARENT(s.p2), { token: I }), 403, 'restricted_resource', 'Insert-only move should return 403');
      assertChecks();
    }, T);

    it('TC_E2E_013_Step5 - Integration A still reads the unchanged page', async () => {
      beginStep(h.flow, 'TC_E2E_013_Step5');
      const a = await getp(s.id);
      stepOk(a, 200, '[Data integrity] A GET');
      eq(val(a.json?.properties?.title), s.title, '[Data integrity] The title should be unchanged');
      eq(nodash(a.json?.parent?.page_id), nodash(s.p), '[Data integrity] The parent should be unchanged');
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_014 — Bulk import, update, move and trash of 50 pages
  // ==========================================================================
  describe('TC_E2E_014 — Bulk import, update, move and trash of 50 pages', () => {
    const h = useFlow('TC_E2E_014');
    const s: any = { a: '', b: '', ids: [] as string[] };
    const flt = { filter: { property: 'Status', select: { equals: 'Done' } } };

    it('TC_E2E_014_Step1 - Create 50 pages in data source A at the allowed rate', async () => {
      beginStep(h.flow, 'TC_E2E_014_Step1');
      const p = await parent();
      const st = { Name: { title: {} }, Status: { select: { options: [{ name: 'Todo' }, { name: 'Done' }] } } };
      s.a = (await mkDb(p, st)).ds;
      s.b = (await mkDb(p, Object.assign({ Extra: { checkbox: {} } }, st))).ds;
      const made = await pool(50, (i) =>
        mkPage(DSP(s.a), { Name: tp(uniq('bulk' + i)), Status: { select: { name: 'Todo' } } }, null, { fast: true })
      );
      s.ids = made.map((r: any) => r.id).filter(Boolean);
      eq(new Set(s.ids).size, 50, '50 distinct pages should be created');
      assertChecks();
    }, T);

    it('TC_E2E_014_Step2 - PATCH all 50 with Status Done and query A with that filter', async () => {
      beginStep(h.flow, 'TC_E2E_014_Step2');
      const up = await pool(50, (i) => patch(s.ids[i], { properties: { Status: { select: { name: 'Done' } } } }, { fast: true }));
      eq(up.filter((r) => r.code === 200).length, 50, 'All 50 updates should return 200');
      ok(await waitFor(async () => (await query(s.a, flt)).results.length === 50, 10, 3000), 'Query of A with the filter should return 50 items');
      assertChecks();
    }, T);

    it('TC_E2E_014_Step3 - Move all 50 to data source B and query both data sources', async () => {
      beginStep(h.flow, 'TC_E2E_014_Step3');
      const mv = await pool(50, (i) => move(s.ids[i], DSP(s.b), { fast: true }));
      eq(mv.filter((r) => r.code === 200).length, 50, 'All 50 moves should return 200');
      ok(await waitFor(async () => (await query(s.a)).results.length === 0, 10, 3000), '[Data integrity] A should have 0 pages');
      ok(await waitFor(async () => (await query(s.b)).results.length === 50, 10, 3000), '[Data integrity] B should have 50 pages');
      assertChecks();
    }, T);

    it('TC_E2E_014_Step4 - Trash all 50 and confirm none appears in B', async () => {
      beginStep(h.flow, 'TC_E2E_014_Step4');
      const tr = await pool(50, (i) => trash(s.ids[i]));
      eq(tr.filter((r) => r.code === 200).length, 50, 'All 50 trashes should return 200');
      ok(await waitFor(async () => (await query(s.b)).results.length === 0, 10, 3000), '[Data integrity] B should have no pages after trash');
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_015 — Concurrent operations leave a consistent state
  // ==========================================================================
  describe('TC_E2E_015 — Concurrent operations leave a consistent state', () => {
    const h = useFlow('TC_E2E_015');
    const s: any = { p: '', p2: '', row: '', page: '' };

    it('TC_E2E_015_Step1 - 5 parallel PATCH on 5 properties with 20 parallel GET', async () => {
      beginStep(h.flow, 'TC_E2E_015_Step1');
      s.p = await parent();
      s.p2 = await parent2();
      s.row = (await basicRow(s.p)).row.id;
      s.page = (await child(s.p, uniq('conc'))).id;
      const body = [
        { Count: { number: 99 } },
        { Done: { checkbox: true } },
        { Link: { url: 'https://example.org' } },
        { Choice: { select: { name: 'Opt2' } } },
        { Tags: { multi_select: [{ name: 'B' }] } },
      ];
      const rs = await burst(25, (i) => (i < 5 ? patch(s.row, { properties: body[i] }, { fast: true }) : getp(s.row, { fast: true })));
      for (let i = 0; i < 5; i++) {
        let r = rs[i];
        chkIn(r, [200, 409], `Parallel PATCH ${i + 1} should return 200 or 409`);
        if (r.code === 409) {
          r = await patch(s.row, { properties: body[i] });
          chk(r, 200, null, `Retry of PATCH ${i + 1} should return 200`);
        }
      }
      rs.slice(5).forEach((r, i) => chk(r, 200, null, `Parallel GET ${i + 1} should return a consistent snapshot`));
      await sleep(1500);
      const f = (await getp(s.row)).json?.properties ?? {};
      eq(
        [f.Count?.number, f.Done?.checkbox, f.Link?.url, f.Choice?.select?.name, val(f.Tags)],
        [99, true, 'https://example.org', 'Opt2', ['B']],
        '[Data integrity] The final state should have all 5 updates'
      );
      assertChecks();
    }, T);

    it('TC_E2E_015_Step2 - PATCH and move the same page at once (10 repetitions)', async () => {
      beginStep(h.flow, 'TC_E2E_015_Step2');
      for (let k = 0; k < 10; k++) {
        const dest = k % 2 === 0 ? s.p2 : s.p;
        const r2 = await burst(2, (i) =>
          i === 0 ? patch(s.page, { properties: { title: tp('rep' + k) } }, { fast: true }) : move(s.page, PARENT(dest), { fast: true })
        );
        r2.forEach((r, i) => chkIn(r, [200, 409], `Repetition ${k + 1} request ${i + 1} should return 200 or 409`));
        await sleep(1200);
        const g = await getp(s.page);
        ok(
          g.code === 200 && [nodash(s.p), nodash(s.p2)].includes(nodash(g.json?.parent?.page_id)),
          `[Data integrity] Repetition ${k + 1} leaves the page under one valid parent`
        );
      }
      assertChecks();
    }, T);

    it('TC_E2E_015_Step3 - 20 parallel creates under one parent produce exactly 20 distinct pages', async () => {
      beginStep(h.flow, 'TC_E2E_015_Step3');
      const p3 = await mkPage({ page_id: env('rootPageId') }, { title: tp(uniq('QA parent3')) });
      track(p3.id);
      const ts = Array.from({ length: 20 }, () => uniq('par'));
      const cr = await burst(20, (i) => send('POST', '/v1/pages', { parent: { page_id: p3.id }, properties: { title: tp(ts[i]) } }, { fast: true }));
      cr.forEach((r, i) => chk(r, 200, null, `Parallel create ${i + 1} should return 200`));
      await sleep(2000);
      const names = (await childPages(p3.id)).map((b: any) => b.child_page.title);
      eq(names.length, 20, '[Data integrity] Exactly 20 pages should exist');
      eq(new Set(names).size, 20, '[Data integrity] The 20 pages should be distinct');
      assertChecks();
    }, T);
  });

  // ==========================================================================
  // TC_E2E_016 — Content fidelity and stored payloads stay inert
  // ==========================================================================
  describe('TC_E2E_016 — Content fidelity and stored payloads stay inert', () => {
    const h = useFlow('TC_E2E_016');
    const s: any = { p: '', p2: '', id: '', s0: [] as string[] };
    const shape = async () =>
      (await children(s.id)).map((b: any) => {
        const c = b[b.type];
        return b.type + ':' + (c && c.rich_text ? c.rich_text.map((t: any) => t.plain_text).join('') : '') + ':' + b.has_children;
      });

    it('TC_E2E_016_Step1 - Create a page with 11 block types including a toggle with children', async () => {
      beginStep(h.flow, 'TC_E2E_016_Step1');
      s.p = await parent();
      s.p2 = await parent2();
      const kids = [
        blk('heading_1', 'Heading'),
        blk('paragraph', 'Paragraph'),
        blk('bulleted_list_item', 'Bullet'),
        blk('numbered_list_item', 'Number'),
        blk('to_do', 'Todo', { checked: false }),
        blk('code', 'console.log(1)', { language: 'javascript' }),
        { object: 'block', type: 'image', image: { type: 'external', external: { url: 'https://example.com/i.png' } } },
        { object: 'block', type: 'divider', divider: {} },
        blk('quote', 'Quote'),
        blk('callout', 'Callout', { icon: { type: 'emoji', emoji: '💡' } }),
      ];
      const tg = blk('toggle', 'Toggle');
      tg.toggle.children = [blk('paragraph', 'Inside')];
      kids.push(tg);
      const r = await send('POST', '/v1/pages', cb(s.p, { children: kids }));
      stepOk(r, 200, 'Create');
      pageOk(r.json, 'Create');
      s.id = r.json?.id;
      track(s.id);
      s.s0 = await shape();
      eq(s.s0.length, 11, 'The page should have 11 blocks');
      assertChecks();
    }, T);

    it('TC_E2E_016_Step2 - Move the page, then PATCH its properties: blocks identical after each step', async () => {
      beginStep(h.flow, 'TC_E2E_016_Step2');
      stepOk(await move(s.id, PARENT(s.p2)), 200, 'Move');
      eq(await shape(), s.s0, '[Data integrity] Blocks should be identical after the move');
      stepOk(await patch(s.id, { properties: { title: tp('Updated title') } }), 200, 'PATCH');
      eq(await shape(), s.s0, '[Data integrity] Blocks should be identical after the update');
      const tgl = (await children(s.id)).find((b: any) => b.type === 'toggle');
      eq(tgl ? (await children(tgl.id)).length : 0, 1, '[Data integrity] The toggle should keep its child');
      assertChecks();
    }, T);

    it('TC_E2E_016_Step3 - Unicode, XSS and SQL injection titles are stored and returned as literal text', async () => {
      beginStep(h.flow, 'TC_E2E_016_Step3');
      const payloads = ['Ünïcødé 日本語 😀', '<script>alert(1)</script>', "' OR 1=1; --"];
      for (const t of payloads) {
        const c = await mkPage({ page_id: s.p }, { title: tp(t) });
        eq(val(c.properties?.title), t, '[Data integrity] Created title is literal: ' + t);
        const g = await getp(c.id);
        eq(val(g.json?.properties?.title), t, '[Data integrity] GET title is literal: ' + t);
        const pi = await allItems(c.id, 'title');
        eq(pi.items.map((i: any) => i.title?.plain_text).join(''), t, '[Data integrity] Property item title is literal: ' + t);
        const nt = t + ' v2';
        const u = await patch(c.id, { properties: { title: tp(nt) } });
        eq(val(u.json?.properties?.title), nt, '[Data integrity] Updated title is literal: ' + nt);
      }
      assertChecks();
    }, T);
  });
});
