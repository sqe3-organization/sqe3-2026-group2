import { expect } from 'vitest';
import { AxiosResponse } from 'axios';
import { RequestManager, TimedAxiosResponse } from '../../../core/api/RequestManager';
import { assertCommonHeadersAndSla } from '../../../core/utils/assertions';
import { DataFactory } from '../../../core/utils/dataFactory';
import { Logger } from '../../../core/utils/logger';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { PagesAPI, PageRequestOptions } from '../../../main/api/endpoints/pagesAPI';
import { DatabasesAPI } from '../../../main/api/endpoints/databasesAPI';
import { DataSourcesAPI } from '../../../main/api/endpoints/dataSourcesAPI';
import { SearchAPI } from '../../../main/api/endpoints/searchAPI';
import { PageObjectSchema, PropertyItemSchema } from '../../../main/api/resources/schemas/pagesSchemas';
import { CaseContext, PageResponse, check, cv, track, useCase } from './pagesContext';

export const pagesAPI = new PagesAPI();
const databasesAPI = new DatabasesAPI();
const dataSourcesAPI = new DataSourcesAPI();
const searchAPI = new SearchAPI();

// ---------------------------------------------------------------------------
// Environment of the Pages module
// ---------------------------------------------------------------------------
const ENV_MAP: Record<string, string> = {
  notionToken: 'NOTION_TOKEN',
  rootPageId: 'NOTION_ROOT_PAGE_ID',
  userId: 'NOTION_USER_ID',
  unsharedPageId: 'NOTION_UNSHARED_PAGE_ID',
  tokenReadOnly: 'NOTION_TOKEN_READ_ONLY',
  tokenInsertOnly: 'NOTION_TOKEN_INSERT_ONLY',
  revokedToken: 'NOTION_REVOKED_TOKEN',
  statusDataSourceId: 'NOTION_STATUS_DATA_SOURCE_ID',
  tokenB: 'NOTION_TOKEN_B',
};

export function env(key: string): string {
  if (key === 'notionVersion') return process.env.NOTION_VERSION || '2025-09-03';
  return process.env[ENV_MAP[key] ?? key] || '';
}

export const PAGES_SLA_MS = 2000;
export const CASE_TIMEOUT_MS = 600_000;
export const pagesPath = '/v1/pages';

// ---------------------------------------------------------------------------
// Rate-limit aware transport (on top of the RequestManager Singleton)
// ---------------------------------------------------------------------------
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface SendOptions {
  fast?: boolean;
  noRetry?: boolean;
  token?: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  code: number;
  json: any;
  error?: string;
  headers: { get: (name: string) => string | null };
  ms: number;
}

const toResult = (res: AxiosResponse, ms: number): SendResult => ({
  code: res.status,
  json: res.data && typeof res.data === 'object' ? res.data : null,
  headers: {
    get: (name: string) => {
      const v = res.headers[name.toLowerCase()];
      return v === undefined || v === null ? null : String(v);
    },
  },
  ms,
});

export const toPageOptions = (o?: SendOptions): PageRequestOptions | undefined => {
  if (!o) return undefined;
  if (o.headers) return { noAuth: true, headers: o.headers };
  if (o.token !== undefined) return { token: o.token };
  return undefined;
};

export async function withRetry(fn: () => Promise<AxiosResponse>, o?: SendOptions): Promise<SendResult> {
  o = o || {};
  if (!o.fast) await sleep(350);
  for (let attempt = 0; ; attempt++) {
    let res: AxiosResponse;
    const started = Date.now();
    try {
      res = await fn();
    } catch (e) {
      Logger.error('[PagesHooks] Request failed', String(e));
      return { code: 0, json: null, error: String(e), headers: { get: () => null }, ms: 0 };
    }
    const ms = (res as TimedAxiosResponse).durationMs ?? Date.now() - started;
    if (res.status === 429 && !o.noRetry && attempt < 6) {
      const ra = parseFloat(String(res.headers['retry-after'] ?? '')) || 1;
      Logger.warn(`[PagesHooks] 429 rate_limited, retrying in ${ra}s (attempt ${attempt + 1})`);
      await sleep(Math.min(ra, 20) * 1000 + 200);
      continue;
    }
    return toResult(res, ms);
  }
}

export async function send(method: string, path: string, body?: unknown, o?: SendOptions): Promise<SendResult> {
  const opts = toPageOptions(o);
  const pagesCall = routePagesEndpoint(method.toUpperCase(), path, body, opts);
  if (pagesCall) return withRetry(pagesCall, o);
  const client = opts
    ? RequestManager.getInstance().getClient({
        authType: opts.noAuth ? 'none' : 'bearer',
        bearerToken: opts.noAuth ? undefined : opts.token,
        extraHeaders: opts.headers,
      })
    : RequestManager.getInstance().getDefaultClient();
  const data = body === undefined || body === null ? undefined : body;
  return withRetry(
    () =>
      client.request({
        method,
        url: path.replace(/^\/v1(?=\/)/, ''),
        data: method.toUpperCase() === 'GET' ? undefined : data,
        transformRequest: typeof data === 'string' ? [(d) => d] : undefined,
      }),
    o
  );
}

function routePagesEndpoint(method: string, path: string, body: unknown, opts?: PageRequestOptions) {
  const m = path.match(/^\/v1\/pages(?:\/([^/?]+)(?:\/(move)|\/properties\/([^/?]+))?)?(?:\?(.*))?$/);
  if (!m) return null;
  const [, id, isMove, propId, qs] = m;
  const data = body === null ? undefined : body;
  if (!id && method === 'POST') return () => pagesAPI.createPage(data, opts);
  if (id && isMove && method === 'POST') return () => pagesAPI.movePage(id, data, opts);
  if (id && propId && method === 'GET') return () => pagesAPI.getPageProperty(id, propId, qs, opts);
  if (id && !isMove && !propId && method === 'GET') return () => pagesAPI.getPage(id, qs, opts);
  if (id && !isMove && !propId && method === 'PATCH') return () => pagesAPI.updatePage(id, data, opts);
  return null;
}

export async function pool<T>(n: number, fn: (i: number) => Promise<T>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < n; i += 3) {
    const chunk: Promise<T>[] = [];
    for (let j = i; j < Math.min(n, i + 3); j++) chunk.push(fn(j));
    out.push(...(await Promise.all(chunk)));
    await sleep(1100);
  }
  return out;
}

export const burst = <T>(n: number, fn: (i: number) => Promise<T>) => Promise.all(Array.from({ length: n }, (_, i) => fn(i)));

export async function waitFor(fn: () => Promise<boolean>, tries?: number, ms?: number) {
  for (let i = 0; i < (tries || 8); i++) {
    if (await fn()) return true;
    await sleep(ms || 1500);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------
export const uniq = (p: string) => p + '-' + DataFactory.text(6).toLowerCase();
export const uuid = () => DataFactory.uuid();
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const uuidRegex = UUID;
export const BAD_UUIDS = ['123', 'not-a-uuid', 'a'.repeat(31), 'a'.repeat(33)];

/** Full header set, used when a check needs a custom Authorization scheme. */
export const hdr = (t?: string): Record<string, string> => ({
  Authorization: 'Bearer ' + (t === undefined ? env('notionToken') : t),
  'Notion-Version': env('notionVersion'),
  'Content-Type': 'application/json',
});

// ---------------------------------------------------------------------------
// Pages endpoints through the Business Layer (with retry)
// ---------------------------------------------------------------------------
export const createPage = (body: unknown, o?: SendOptions) => withRetry(() => pagesAPI.createPage(body, toPageOptions(o)), o);
export const getp = (id: string, o?: SendOptions) => withRetry(() => pagesAPI.getPage(id, undefined, toPageOptions(o)), o);
export const getpq = (id: string, qs: string, o?: SendOptions) => withRetry(() => pagesAPI.getPage(id, qs, toPageOptions(o)), o);
export const prop = (id: string, pid: string, qs?: string, o?: SendOptions) =>
  withRetry(() => pagesAPI.getPageProperty(id, pid, qs, toPageOptions(o)), o);
export const patch = (id: string, body: unknown, o?: SendOptions) => withRetry(() => pagesAPI.updatePage(id, body, toPageOptions(o)), o);
export const move = (id: string, parentObj: unknown, o?: SendOptions) =>
  withRetry(() => pagesAPI.movePage(id, { parent: parentObj }, toPageOptions(o)), o);
export const trash = (id: string, token?: string) =>
  withRetry(() => pagesAPI.trashPage(id, token === undefined ? undefined : { token }));

// ---------------------------------------------------------------------------
// Postcondition: every page created by a case goes to the trash (Notion has no permanent delete)
// ---------------------------------------------------------------------------
export async function cleanupCase(c?: CaseContext) {
  if (c) useCase(c);
  const toTrash = [cv.get('parentPageId'), cv.get('parent2Id'), ...JSON.parse(cv.get('tracked') || '[]')];
  for (const pageToTrash of toTrash) {
    if (!pageToTrash) continue;
    try {
      await pagesAPI.trashPage(pageToTrash);
    } catch (err) {
      Logger.error(`[PagesHooks] Could not trash page ${pageToTrash}`, String(err));
    }
  }
  Logger.debug(`[PagesHooks] Cleanup moved ${toTrash.filter(Boolean).length} pages to the trash`);
  cv.set('tracked', '[]');
}

// ---------------------------------------------------------------------------
// Test data builders (preconditions created by API)
// ---------------------------------------------------------------------------
const title = (content: string) => ({ title: [{ type: 'text', text: { content } }] });

export async function mkPage(parentRef: any, props: any, extra?: any, o?: SendOptions): Promise<any> {
  const r = await createPage(Object.assign({ parent: parentRef, properties: props }, extra || {}), o);
  if (r.code !== 200) Logger.error('[PagesHooks] mkPage failed', { code: r.code, body: r.json });
  return r.json || {};
}

/** Precondition used by almost every case: a parent page under the root page shared with the integration. */
export async function createParentPage(pageTitle = 'QA parent - ' + Date.now()): Promise<string> {
  const j = await mkPage({ page_id: env('rootPageId') }, { title: { title: [{ text: { content: pageTitle } }] } });
  if (!j.id) throw new Error('Precondition failed: the parent page could not be created');
  cv.set('parentPageId', j.id);
  return j.id;
}

export async function parent(): Promise<string> {
  const j = await mkPage({ page_id: env('rootPageId') }, { title: title(uniq('QA parent')) });
  cv.set('parentPageId', j.id);
  track(j.id);
  return j.id;
}

export async function mkDb(p: string, props: any, name?: string) {
  const r = await withRetry(() =>
    databasesAPI.createDatabase({
      parent: { type: 'page_id', page_id: p },
      title: [{ type: 'text', text: { content: name || uniq('QA db') } }],
      initial_data_source: { properties: props },
    })
  );
  if (r.code !== 200) Logger.error('[PagesHooks] mkDb failed', { code: r.code, body: r.json });
  const j = r.json || {};
  const ds = j.data_sources && j.data_sources[0] ? j.data_sources[0].id : null;
  cv.set('dbId', j.id);
  cv.set('dsId', ds);
  return { db: j.id, ds: ds, json: j };
}

export const updateDs = (ds: string, body: unknown) => withRetry(() => dataSourcesAPI.updateDataSource(ds, body));

export const basicProps = (): Record<string, any> => ({
  Name: { title: {} },
  Notes: { rich_text: {} },
  Count: { number: {} },
  Choice: { select: { options: [{ name: 'Opt1' }, { name: 'Opt2' }] } },
  Tags: { multi_select: { options: [{ name: 'A' }, { name: 'B' }] } },
  Done: { checkbox: {} },
  When: { date: {} },
  Link: { url: {} },
  Mail: { email: {} },
  Phone: { phone_number: {} },
});

export const dsBasic = (p: string) => mkDb(p, basicProps());

export async function dsFull(p: string) {
  const rel = await mkDb(p, { Name: { title: {} }, Count: { number: {} } }, uniq('QA related'));
  const main = await mkDb(
    p,
    Object.assign(basicProps(), {
      Who: { people: {} },
      Files: { files: {} },
      Related: { relation: { data_source_id: rel.ds, single_property: {} } },
      CreatedAt: { created_time: {} },
      CreatedBy: { created_by: {} },
      EditedAt: { last_edited_time: {} },
      EditedBy: { last_edited_by: {} },
    }),
    uniq('QA full')
  );
  await updateDs(main.ds, {
    properties: {
      Formula: { formula: { expression: 'prop("Count") * 2' } },
      Rollup: { rollup: { relation_property_name: 'Related', rollup_property_name: 'Count', function: 'sum' } },
    },
  });
  await updateDs(main.ds, { properties: { Uid: { unique_id: {} } } });
  cv.set('relDsId', rel.ds);
  cv.set('dsId', main.ds);
  return { ds: main.ds, db: main.db, relDs: rel.ds };
}

let userCache: string[] | null = null;
export async function userIds(): Promise<string[]> {
  if (env('userId')) return [env('userId')];
  if (userCache) return userCache;
  let ids: string[] = [];
  const r = await send('GET', '/v1/users?page_size=100');
  if (r.code === 200 && r.json) ids = (r.json.results || []).filter((u: any) => u.type === 'person').map((u: any) => u.id);
  if (!ids.length) {
    const m = await send('GET', '/v1/users/me');
    if (m.code === 200 && m.json?.id) ids = [m.json.id];
  }
  userCache = ids;
  return ids;
}

export function fullRowProps(userId?: string, relId?: string) {
  const name = uniq('QA row');
  const props: Record<string, any> = {
    Name: title(name),
    Notes: { rich_text: [{ type: 'text', text: { content: 'some notes' } }] },
    Count: { number: 42 },
    Choice: { select: { name: 'Opt1' } },
    Tags: { multi_select: [{ name: 'A' }, { name: 'B' }] },
    Done: { checkbox: true },
    When: { date: { start: '2026-11-01' } },
    Link: { url: 'https://example.com' },
    Mail: { email: 'qa@example.com' },
    Phone: { phone_number: '+59170000000' },
    Files: { files: [{ name: 'f.png', type: 'external', external: { url: 'https://example.com/f.png' } }] },
  };
  const expected: Record<string, any> = {
    Name: name,
    Notes: 'some notes',
    Count: 42,
    Choice: 'Opt1',
    Tags: ['A', 'B'],
    Done: true,
    When: '2026-11-01',
    Link: 'https://example.com',
    Mail: 'qa@example.com',
    Phone: '+59170000000',
    Files: ['f.png'],
  };
  if (userId) {
    props.Who = { people: [{ id: userId }] };
    expected.Who = [userId];
  }
  if (relId) {
    props.Related = { relation: [{ id: relId }] };
    expected.Related = [relId];
  }
  return { props, expected };
}

export async function fullRow(p: string) {
  const d = await dsFull(p);
  const rr = await mkPage({ type: 'data_source_id', data_source_id: d.relDs }, { Name: title(uniq('rel')), Count: { number: 5 } });
  const ids = await userIds();
  const fp = fullRowProps(ids[0], rr.id);
  const row = await mkPage({ type: 'data_source_id', data_source_id: d.ds }, fp.props);
  cv.set('pageId', row.id);
  cv.set('targetId', row.id);
  cv.set('expected', JSON.stringify(fp.expected));
  return { row, ds: d.ds, db: d.db, relDs: d.relDs, relRow: rr, expected: fp.expected, userId: ids[0], users: ids };
}

export async function fullPrep(p: string) {
  const d = await dsFull(p);
  const rr = await mkPage({ type: 'data_source_id', data_source_id: d.relDs }, { Name: title(uniq('rel')), Count: { number: 5 } });
  const ids = await userIds();
  const fp = fullRowProps(ids[0], rr.id);
  cv.set('expected', JSON.stringify(fp.expected));
  return { d, rr, ids, fp };
}

export async function basicRow(p: string, extraProps?: Record<string, any>) {
  const d = await dsBasic(p);
  const name = uniq('QA row');
  const row = await mkPage(
    { type: 'data_source_id', data_source_id: d.ds },
    Object.assign(
      {
        Name: title(name),
        Count: { number: 10 },
        Choice: { select: { name: 'Opt1' } },
        Tags: { multi_select: [{ name: 'A' }, { name: 'B' }] },
        Done: { checkbox: false },
        Link: { url: 'https://example.com' },
      },
      extraProps || {}
    )
  );
  cv.set('pageId', row.id);
  cv.set('targetId', row.id);
  return { row, ds: d.ds, db: d.db, name };
}

export async function relPage(p: string, n: number) {
  const rel = await mkDb(p, { Name: { title: {} } }, uniq('QA targets'));
  const main = await mkDb(p, { Name: { title: {} }, Related: { relation: { data_source_id: rel.ds, single_property: {} } } }, uniq('QA holder'));
  const targets: string[] = [];
  await pool(n, async (i) => {
    const t = await mkPage({ type: 'data_source_id', data_source_id: rel.ds }, { Name: title('t' + i) }, null, { fast: true });
    targets[i] = t.id;
  });
  const row = await mkPage(
    { type: 'data_source_id', data_source_id: main.ds },
    { Name: title(uniq('holder')), Related: { relation: targets.map((id) => ({ id })) } }
  );
  cv.set('pageId', row.id);
  cv.set('targetId', row.id);
  cv.set('dsId', main.ds);
  return { row, ds: main.ds, relDs: rel.ds, targets, propId: row.properties?.Related?.id };
}

export async function dual(p: string, n: number) {
  const proj = await mkDb(p, { Name: { title: {} } }, uniq('QA projects'));
  const task = await mkDb(
    p,
    { Name: { title: {} }, Count: { number: {} }, Project: { relation: { data_source_id: proj.ds, dual_property: {} } } },
    uniq('QA tasks')
  );
  const project = await mkPage({ type: 'data_source_id', data_source_id: proj.ds }, { Name: title(uniq('project')) });
  const tasks: string[] = [];
  await pool(n, async (i) => {
    const t = await mkPage(
      { type: 'data_source_id', data_source_id: task.ds },
      { Name: title('task' + i), Count: { number: (i + 1) * 10 }, Project: { relation: [{ id: project.id }] } },
      null,
      { fast: true }
    );
    tasks[i] = t.id;
  });
  let revName: string | undefined;
  let revId: string | undefined;
  for (let k = 0; k < 5 && !revName; k++) {
    const pj = (await getp(project.id)).json || { properties: {} };
    revName = Object.keys(pj.properties).find((x) => pj.properties[x].type === 'relation');
    if (revName) revId = pj.properties[revName].id;
    else await sleep(1500);
  }
  await updateDs(proj.ds, {
    properties: { Total: { rollup: { relation_property_name: revName, rollup_property_name: 'Count', function: 'sum' } } },
  });
  await updateDs(proj.ds, { properties: { Doubled: { formula: { expression: 'prop("Total") * 2' } } } });
  const ids = await propIds(project.id);
  cv.set('pageId', project.id);
  cv.set('targetId', project.id);
  cv.set('dsId', proj.ds);
  return {
    projDs: proj.ds,
    taskDs: task.ds,
    project,
    tasks,
    revName,
    revId,
    totalId: ids.Total,
    doubledId: ids.Doubled,
    sum: (10 * n * (n + 1)) / 2,
  };
}

export async function tree(p: string, levels: number, per: number) {
  const top = await mkPage({ page_id: p }, { title: title(uniq('tree top')) });
  const all: Array<{ id: string; parent: string }> = [{ id: top.id, parent: p }];
  let layer: string[] = [top.id];
  for (let l = 0; l < levels; l++) {
    const next: string[] = [];
    for (const pid of layer)
      for (let k = 0; k < per; k++) {
        const c = await mkPage({ page_id: pid }, { title: title(uniq('tree')) });
        all.push({ id: c.id, parent: pid });
        next.push(c.id);
      }
    layer = next;
  }
  return { top: top.id as string, all };
}

// ---------------------------------------------------------------------------
// Block builders and payload generators
// ---------------------------------------------------------------------------
export const blk = (type: string, text?: string, extra?: Record<string, any>): any => {
  const o: any = { object: 'block', type };
  o[type] = Object.assign({ rich_text: [{ type: 'text', text: { content: text || 'text' } }] }, extra || {});
  return o;
};
export const blocks = (n: number) => Array.from({ length: n }, (_, i) => blk('paragraph', 'p' + (i + 1)));
export const nest = (d: number, i?: number): any => {
  const b = blk('toggle', 'L' + (i || 0));
  if (d > 0) b.toggle.children = [nest(d - 1, (i || 0) + 1)];
  return b;
};
export const tree1000 = (extra?: boolean) =>
  Array.from({ length: 100 }, (_, i) => {
    const t = blk('toggle', 't' + i);
    t.toggle.children = Array.from({ length: 9 + (extra && i === 0 ? 1 : 0) }, (_, j) => blk('paragraph', 'c' + j));
    return t;
  });

export function cb(p: string, extra?: Record<string, any>, pageTitle?: string): any {
  const t = pageTitle === undefined ? uniq('QA page') : pageTitle;
  cv.set('pageTitle', t);
  return Object.assign({ parent: { page_id: p }, properties: { title: title(t) } }, extra || {});
}

export function bodyOfSize(p: string, target: number, over?: boolean) {
  const b = cb(p, { children: [] });
  const piece = { type: 'text', text: { content: 'x'.repeat(2000) } };
  let par: any = null;
  const size = () => JSON.stringify(b).length;
  for (;;) {
    if (!par || par.paragraph.rich_text.length >= 50) {
      par = { object: 'block', type: 'paragraph', paragraph: { rich_text: [] } };
      b.children.push(par);
    }
    par.paragraph.rich_text.push(Object.assign({}, piece));
    const s = size();
    if (over ? s >= target : s + 2100 >= target) {
      if (!over) par.paragraph.rich_text.pop();
      break;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// Readers used by the data integrity checks
// ---------------------------------------------------------------------------
export async function children(id: string): Promise<any[]> {
  const out: any[] = [];
  let cur: string | null | undefined;
  do {
    const r = await send('GET', '/v1/blocks/' + id + '/children?page_size=100' + (cur ? '&start_cursor=' + cur : ''));
    if (r.code !== 200) break;
    out.push(...r.json.results);
    cur = r.json.has_more ? r.json.next_cursor : null;
  } while (cur);
  return out;
}
export const childPages = async (id: string) => (await children(id)).filter((b) => b.type === 'child_page');
export const childCount = async (id: string) => (await childPages(id)).length;

export async function query(ds: string, body?: Record<string, any>) {
  const out: any[] = [];
  let cur: string | null | undefined;
  do {
    const b: Record<string, any> = Object.assign({ page_size: 100 }, body || {});
    if (cur) b.start_cursor = cur;
    const r = await withRetry(() => dataSourcesAPI.queryDataSource(ds, b));
    if (r.code !== 200) return { code: r.code, results: out, json: r.json };
    out.push(...r.json.results);
    cur = r.json.has_more ? r.json.next_cursor : null;
  } while (cur);
  return { code: 200, results: out };
}
export const inQuery = (ds: string, id: string, body?: Record<string, any>) =>
  waitFor(async () => (await query(ds, body)).results.some((r: any) => r.id === id));
export const notInQuery = (ds: string, id: string, body?: Record<string, any>) =>
  waitFor(async () => !(await query(ds, body)).results.some((r: any) => r.id === id));

export const search = (body: Record<string, any>) => withRetry(() => searchAPI.search(body as any));

export async function allItems(id: string, pid: string, ps?: number) {
  const out: any[] = [];
  let cur: string | null | undefined;
  let pages = 0;
  do {
    const r = await prop(id, pid, `page_size=${ps || 100}` + (cur ? '&start_cursor=' + cur : ''));
    if (r.code !== 200) break;
    out.push(...r.json.results);
    cur = r.json.has_more ? r.json.next_cursor : null;
    pages++;
  } while (cur);
  return { items: out, pages };
}

export async function propIds(id: string): Promise<Record<string, string>> {
  const r = await getp(id);
  const m: Record<string, string> = {};
  const pr = (r.json && r.json.properties) || {};
  for (const k in pr) m[k] = pr[k].id;
  return m;
}

export function val(p: any): any {
  if (!p) return undefined;
  switch (p.type) {
    case 'title':
      return p.title.map((t: any) => t.plain_text).join('');
    case 'rich_text':
      return p.rich_text.map((t: any) => t.plain_text).join('');
    case 'select':
      return p.select ? p.select.name : null;
    case 'status':
      return p.status ? p.status.name : null;
    case 'multi_select':
      return p.multi_select.map((o: any) => o.name);
    case 'date':
      return p.date ? p.date.start : null;
    case 'people':
      return p.people.map((u: any) => u.id);
    case 'files':
      return p.files.map((f: any) => f.name);
    case 'relation':
      return p.relation.map((r: any) => r.id);
    default:
      return p[p.type];
  }
}

// ---------------------------------------------------------------------------
// Shared checks (Layers 2, 3 and 4)
// ---------------------------------------------------------------------------

export function expectPageSchema(body: unknown) {
  SchemaValidator.assertValid(PageObjectSchema, body);
}

export function expectPropertyItemSchema(body: unknown) {
  SchemaValidator.assertValid(PropertyItemSchema, body);
}

export function commonChecks(res: PageResponse, maxMs = PAGES_SLA_MS) {
  check('Preconditions should be created', () => {
    expect(cv.get('precondError') || '').to.eql('');
  });
  check('Content-Type should be application/json', () => {
    expect(res.headers).to.have.property('content-type');
    expect(String(res.headers['content-type'])).to.include('application/json');
  });
  check(`Response time should be less than ${maxMs}ms`, () => {
    expect(res.durationMs).to.be.below(maxMs);
  });
  check('Common headers and SLA (team contract)', () => {
    assertCommonHeadersAndSla(res, maxMs);
  });
}

export async function authFails(method: string, path: string, body?: unknown) {
  const tokens = ['', 'ntn_invalid_token_000', (env('notionToken') || '').slice(0, -1)];
  for (const t of tokens) {
    const r = await send(method, path, body, { token: t });
    check("Invalid token '" + t.slice(0, 6) + "...' should return 401", () => {
      expect(r.code, 'status').to.eql(401);
      expect(r.json.object).to.eql('error');
      expect(r.json.code).to.eql('unauthorized');
    });
  }
  const h = hdr();
  h.Authorization = 'Basic ' + env('notionToken');
  const b = await send(method, path, body, { headers: h });
  check('Basic scheme should return 401', () => {
    expect(b.code, 'status').to.eql(401);
    expect(b.json.object).to.eql('error');
    expect(b.json.code).to.eql('unauthorized');
  });
}

export async function badIds(method: string, pathFn: (id: string) => string, body?: unknown, ec?: string) {
  for (const id of BAD_UUIDS) {
    const r = await send(method, pathFn(id), body);
    check("Invalid UUID '" + id.slice(0, 12) + "' should return 400", () => {
      expect(r.code, 'status').to.eql(400);
      expect(r.json.object).to.eql('error');
      expect(r.json.code).to.eql(ec || 'validation_error');
    });
  }
}

export async function burst429(method: string, path: string, body?: unknown) {
  const rs = await burst(40, () => send(method, path, body, { fast: true, noRetry: true }));
  const limited = rs.filter((r) => r.code === 429);
  check('Rate limit should return at least one 429 in a burst of 40 requests', () => {
    expect(!!(limited.length >= 1)).to.be.true;
  });
  check('429 responses should have code rate_limited and a Retry-After header', () => {
    limited.forEach((r) => {
      expect(r.json.code).to.eql('rate_limited');
      expect(r.headers.get('Retry-After')).to.not.be.null;
    });
  });
  await sleep(2500);
  return rs;
}

// ---------------------------------------------------------------------------
// Chaining helpers used by the E2E flows
// ---------------------------------------------------------------------------
export const nodash = (s: unknown) => String(s).replace(/-/g, '');
export const rt = (s: string) => [{ type: 'text', text: { content: s } }];
export const tp = (s: string) => ({ title: rt(s) });
export const PARENT = (id: string) => ({ type: 'page_id', page_id: id });
export const DSP = (id: string) => ({ type: 'data_source_id', data_source_id: id });

export async function parent2(): Promise<string> {
  const j = await mkPage({ page_id: env('rootPageId') }, { title: tp(uniq('QA parent2')) });
  cv.set('parent2Id', j.id);
  track(j.id);
  return j.id;
}

export async function child(p: string, pageTitle?: string, extra?: Record<string, any>) {
  const j = await mkPage({ page_id: p }, { title: tp(pageTitle || uniq('QA page')) }, extra);
  cv.set('pageId', j.id);
  cv.set('targetId', j.id);
  return j;
}

export function chk(r: SendResult, code: number, ec: string | null, label: string) {
  check(label, () => {
    expect(r.code, 'status').to.eql(code);
    if (ec) {
      expect(r.json.object).to.eql('error');
      expect(r.json.code).to.eql(ec);
    }
  });
}
export function chkIn(r: SendResult, codes: number[], label: string) {
  check(label, () => expect(codes).to.include(r.code));
}
export const eq = (a: unknown, b: unknown, msg: string) => check(msg, () => expect(a).to.eql(b));
export const ok = (c: unknown, msg: string) => check(msg, () => expect(!!c).to.be.true);

export function pageOk(j: any, label = 'Response') {
  check(`${label} body should be a page object`, () => {
    expect(j.object).to.eql('page');
    expect(j.id).to.match(UUID);
    expect(j.in_trash).to.be.false;
  });
  check(`${label} should contain the metadata fields`, () => {
    expect(new Date(j.created_time).toISOString()).to.eql(j.created_time);
    expect(new Date(j.last_edited_time).toISOString()).to.eql(j.last_edited_time);
    expect(j.created_by.object).to.eql('user');
    expect(j.last_edited_by.object).to.eql('user');
  });
  check(`${label} schema should be valid`, () => expectPageSchema(j));
}

export function stepOk(r: SendResult, code: number, label: string, maxMs = PAGES_SLA_MS) {
  check(`${label} should return ${code}`, () => expect(r.code, 'status').to.eql(code));
  check(`${label} should return application/json within ${maxMs} ms`, () => {
    expect(String(r.headers.get('content-type'))).to.include('application/json');
    expect(r.ms).to.be.below(maxMs);
  });
}
