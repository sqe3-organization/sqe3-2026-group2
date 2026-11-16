/**
 * Pages kit — shared runtime of the Pages module suites (Activity #6).
 *
 * It replaces the Postman runtime used by Notion_Pages.postman_collection.json:
 *   pm.environment.get        -> env()
 *   pm.collectionVariables    -> cv (one fresh store per test case)
 *   pm.request (main request) -> startCase().request
 *   pm.sendRequest            -> sendRequest() (Axios)
 *   pm.test                   -> check() (named soft assertion, reported together at the end)
 * and exports the 45 helpers that every Postman script used to copy.
 */
import axios, { AxiosResponse } from 'axios';
import { appendFileSync } from 'node:fs';
import { expect } from 'vitest';
import { assertCommonHeadersAndSla } from '../core/assertions.js';
import { expectPageSchema } from './pageSchemas.js';

// ---------------------------------------------------------------------------
// Environment (Postman environment "Notion Pages" -> process.env)
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
  if (key === 'apiBaseURL') return (process.env.NOTION_BASE_URL || 'https://api.notion.com/v1').replace(/\/v1\/?$/, '');
  if (key === 'notionVersion') return process.env.NOTION_VERSION || '2025-09-03';
  return process.env[ENV_MAP[key] ?? key] || '';
}

export const PAGES_SLA_MS = 2000;
export const CASE_TIMEOUT_MS = 600_000;
export const pagesPath = '/v1/pages';
export const pagesUrl = `${env('apiBaseURL')}${pagesPath}`;
export const headers = {
  Authorization: `Bearer ${env('notionToken')}`,
  'Notion-Version': env('notionVersion'),
  'Content-Type': 'application/json',
};

const http = axios.create({ validateStatus: () => true, transformRequest: [(d) => d], responseType: 'text' });

export type PageResponse = AxiosResponse<any> & { durationMs: number; rawBody: string };

// ---------------------------------------------------------------------------
// Test case context
// ---------------------------------------------------------------------------
type Auth = { type: 'bearer'; token: string } | { type: 'noauth' };

interface CaseRequest {
  method: string;
  url: string;
  body: string;
  headers: Record<string, string>;
  auth: Auth;
}

interface CheckResult {
  name: string;
  error?: string;
}

class CaseContext {
  vars = new Map<string, string>([
    ['pagesEndpoint', pagesPath],
    ['tracked', '[]'],
  ]);
  checks: CheckResult[] = [];
  request: CaseRequest & {
    removeHeader: (k: string) => void;
    setHeader: (k: string, v: string) => void;
  };

  constructor(public id: string, req: CaseRequest) {
    const r = { ...req, headers: { ...req.headers } };
    this.request = Object.assign(r, {
      removeHeader: (k: string) => {
        for (const h of Object.keys(r.headers)) if (h.toLowerCase() === k.toLowerCase()) delete r.headers[h];
      },
      setHeader: (k: string, v: string) => {
        for (const h of Object.keys(r.headers)) if (h.toLowerCase() === k.toLowerCase()) delete r.headers[h];
        r.headers[k] = v;
      },
    });
  }

  resolve(template: string): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (k === 'apiBaseURL' ? env(k) : this.vars.get(k) ?? env(k)));
  }

  // The request under test (the Postman request itself)
  async sendMain(): Promise<PageResponse> {
    const h: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.request.headers)) h[k] = this.resolve(v);
    const hasAuth = Object.keys(h).some((k) => k.toLowerCase() === 'authorization');
    if (!hasAuth && this.request.auth.type === 'bearer') h.Authorization = `Bearer ${this.resolve(this.request.auth.token)}`;
    const method = this.request.method.toUpperCase();
    const started = Date.now();
    const res = (await http.request({
      method,
      url: this.resolve(this.request.url),
      headers: h,
      data: method === 'GET' ? undefined : this.resolve(this.request.body),
    })) as PageResponse;
    res.durationMs = Date.now() - started;
    res.rawBody = typeof res.data === 'string' ? res.data : '';
    try {
      res.data = JSON.parse(res.rawBody);
    } catch {
      res.data = null;
    }
    return res;
  }
}

let current: CaseContext | null = null;
const ctx = (): CaseContext => {
  if (!current) throw new Error('startCase() must be called first');
  return current;
};

export function startCase(id: string, req: CaseRequest): CaseContext {
  current = new CaseContext(id, {
    ...req,
    // Collection-level pre-request: every request sends Notion-Version
    headers: { 'Notion-Version': '{{notionVersion}}', ...req.headers },
  });
  return current;
}

// Chained E2E flows: one context shared by every step of the flow
export function startFlow(id: string): CaseContext {
  current = new CaseContext(id, { method: 'GET', url: '', body: '', headers: {}, auth: { type: 'noauth' } });
  return current;
}

// Starts a step of a flow: same variables, fresh list of checks
export function beginStep(flow: CaseContext, stepId: string) {
  current = flow;
  flow.id = stepId;
  flow.checks = [];
}

export function useCase(c: CaseContext) {
  current = c;
}

export const cv = {
  get: (k: string): any => ctx().vars.get(k) ?? '',
  set: (k: string, v: unknown) => {
    ctx().vars.set(k, v === undefined || v === null ? '' : String(v));
  },
};

// pm.test -> named soft assertion
export function check(name: string, fn: () => void) {
  try {
    fn();
    ctx().checks.push({ name });
  } catch (e: any) {
    ctx().checks.push({ name, error: e?.message ?? String(e) });
  }
}

// Fails the Vitest test with every failed check, so one run shows all of them like the Postman report
export function assertChecks() {
  const c = ctx();
  const failed = c.checks.filter((x) => x.error);
  const summary = failed.map((f) => `  ✗ ${f.name}: ${f.error}`).join('\n');
  // Optional machine-readable log of every check (PAGES_CHECK_LOG=path)
  if (process.env.PAGES_CHECK_LOG) appendFileSync(process.env.PAGES_CHECK_LOG, JSON.stringify({ id: c.id, checks: c.checks }) + '\n');
  expect(c.checks.length, `${c.id} ran no checks`).toBeGreaterThan(0);
  expect(failed.length, `${c.id}: ${failed.length} of ${c.checks.length} checks failed\n${summary}`).toBe(0);
}

// Layer 2 (headers + SLA) and the precondition check, shared by every case
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
    assertCommonHeadersAndSla(res as any, maxMs);
  });
}

// Moves to the trash every page created by the case (Notion has no permanent delete)
export async function cleanupCase(c?: CaseContext) {
  if (c) current = c;
  const toTrash = [cv.get('parentPageId'), cv.get('parent2Id'), ...JSON.parse(cv.get('tracked') || '[]')];
  for (const pageToTrash of toTrash) {
    if (!pageToTrash) continue;
    try {
      await sendRequest({
        url: `${pagesUrl}/${pageToTrash}`,
        method: 'PATCH',
        header: headers,
        body: { mode: 'raw', raw: JSON.stringify({ in_trash: true }) },
      });
    } catch (err) {
      console.error(err);
    }
  }
  cv.set('tracked', '[]');
}

// ---------------------------------------------------------------------------
// HTTP (pm.sendRequest replacement on top of Axios)
// ---------------------------------------------------------------------------
export interface PmLikeRequest {
  url: string;
  method: string;
  header?: Record<string, string>;
  body?: { mode: 'raw'; raw: string };
}

export interface PmLikeResponse {
  code: number;
  json: () => any;
  text: () => string;
  headers: { get: (name: string) => string | null };
  responseTime: number;
}

export async function sendRequest(req: PmLikeRequest): Promise<PmLikeResponse> {
  const started = Date.now();
  const res = await http.request({
    url: req.url,
    method: req.method,
    headers: req.header,
    data: req.body?.raw,
  });
  const raw = typeof res.data === 'string' ? res.data : '';
  return {
    code: res.status,
    json: () => JSON.parse(raw),
    text: () => raw,
    headers: {
      get: (name: string) => {
        const v = res.headers[name.toLowerCase()];
        return v === undefined || v === null ? null : String(v);
      },
    },
    responseTime: Date.now() - started,
  };
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const uniq = (p: string) => p + '-' + Math.random().toString(36).slice(2, 8);
export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const uuidRegex = UUID;
export const BAD_UUIDS = ['123', 'not-a-uuid', 'a'.repeat(31), 'a'.repeat(33)];

export const hdr = (t?: string): Record<string, string> => ({
  Authorization: 'Bearer ' + (t === undefined ? env('notionToken') : t),
  'Notion-Version': env('notionVersion'),
  'Content-Type': 'application/json',
});

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

// Rate-limit aware request: 350 ms pause and up to 6 retries on 429 using Retry-After
export async function send(method: string, path: string, body?: unknown, o?: SendOptions): Promise<SendResult> {
  o = o || {};
  if (!o.fast) await sleep(350);
  let attempt = 0;
  for (;;) {
    const req: PmLikeRequest = { url: env('apiBaseURL') + path, method, header: o.headers || hdr(o.token) };
    if (body !== undefined && body !== null)
      req.body = { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body) };
    let res: PmLikeResponse;
    try {
      res = await sendRequest(req);
    } catch (e) {
      return { code: 0, json: null, error: String(e), headers: { get: () => null }, ms: 0 };
    }
    if (res.code === 429 && !o.noRetry && attempt < 6) {
      attempt++;
      const ra = parseFloat(res.headers.get('Retry-After') ?? '') || 1;
      await sleep(Math.min(ra, 20) * 1000 + 200);
      continue;
    }
    let j: any = null;
    try {
      j = res.json();
    } catch {}
    return { code: res.code, json: j, headers: res.headers, ms: res.responseTime };
  }
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

export const burst = <T>(n: number, fn: (i: number) => Promise<T>) =>
  Promise.all(Array.from({ length: n }, (_, i) => fn(i)));

export async function waitFor(fn: () => Promise<boolean>, tries?: number, ms?: number) {
  for (let i = 0; i < (tries || 8); i++) {
    if (await fn()) return true;
    await sleep(ms || 1500);
  }
  return false;
}

export function track(id: string) {
  const a = JSON.parse(cv.get('tracked') || '[]');
  a.push(id);
  cv.set('tracked', JSON.stringify(a));
}

// pm.request.body.update -> body of the request under test
export function setBody(o: unknown) {
  const raw = typeof o === 'string' ? o : JSON.stringify(o);
  cv.set('lastBody', raw);
  ctx().request.body = raw;
}

// ---------------------------------------------------------------------------
// Test data builders (preconditions created by API)
// ---------------------------------------------------------------------------
const title = (content: string) => ({ title: [{ type: 'text', text: { content } }] });

export async function mkPage(parentRef: any, props: any, extra?: any, o?: SendOptions): Promise<any> {
  const r = await send('POST', '/v1/pages', Object.assign({ parent: parentRef, properties: props }, extra || {}), o);
  if (r.code !== 200) console.error('mkPage failed', r.code, JSON.stringify(r.json));
  return r.json || {};
}

export async function parent(): Promise<string> {
  const j = await mkPage({ page_id: env('rootPageId') }, { title: title(uniq('QA parent')) });
  cv.set('parentPageId', j.id);
  track(j.id);
  return j.id;
}

export async function mkDb(p: string, props: any, name?: string) {
  const r = await send('POST', '/v1/databases', {
    parent: { type: 'page_id', page_id: p },
    title: [{ type: 'text', text: { content: name || uniq('QA db') } }],
    initial_data_source: { properties: props },
  });
  if (r.code !== 200) console.error('mkDb failed', r.code, JSON.stringify(r.json));
  const j = r.json || {};
  const ds = j.data_sources && j.data_sources[0] ? j.data_sources[0].id : null;
  cv.set('dbId', j.id);
  cv.set('dsId', ds);
  return { db: j.id, ds: ds, json: j };
}

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
  await send('PATCH', '/v1/data_sources/' + main.ds, {
    properties: {
      Formula: { formula: { expression: 'prop("Count") * 2' } },
      Rollup: { rollup: { relation_property_name: 'Related', rollup_property_name: 'Count', function: 'sum' } },
    },
  });
  await send('PATCH', '/v1/data_sources/' + main.ds, { properties: { Uid: { unique_id: {} } } });
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
  const rr = await mkPage(
    { type: 'data_source_id', data_source_id: d.relDs },
    { Name: title(uniq('rel')), Count: { number: 5 } }
  );
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
  const rr = await mkPage(
    { type: 'data_source_id', data_source_id: d.relDs },
    { Name: title(uniq('rel')), Count: { number: 5 } }
  );
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
  const main = await mkDb(
    p,
    { Name: { title: {} }, Related: { relation: { data_source_id: rel.ds, single_property: {} } } },
    uniq('QA holder')
  );
  const targets: string[] = [];
  await pool(n, async (i) => {
    const t = await mkPage({ type: 'data_source_id', data_source_id: rel.ds }, { Name: title('t' + i) }, null, {
      fast: true,
    });
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
    const pj = (await send('GET', '/v1/pages/' + project.id)).json || { properties: {} };
    revName = Object.keys(pj.properties).find((x) => pj.properties[x].type === 'relation');
    if (revName) revId = pj.properties[revName].id;
    else await sleep(1500);
  }
  await send('PATCH', '/v1/data_sources/' + proj.ds, {
    properties: { Total: { rollup: { relation_property_name: revName, rollup_property_name: 'Count', function: 'sum' } } },
  });
  await send('PATCH', '/v1/data_sources/' + proj.ds, {
    properties: { Doubled: { formula: { expression: 'prop("Total") * 2' } } },
  });
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
    const r = await send('POST', '/v1/data_sources/' + ds + '/query', b);
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

export async function allItems(id: string, pid: string, ps?: number) {
  const out: any[] = [];
  let cur: string | null | undefined;
  let pages = 0;
  do {
    const r = await send(
      'GET',
      `${pagesPath}/${id}/properties/${pid}?page_size=${ps || 100}` + (cur ? '&start_cursor=' + cur : ''),
      null
    );
    if (r.code !== 200) break;
    out.push(...r.json.results);
    cur = r.json.has_more ? r.json.next_cursor : null;
    pages++;
  } while (cur);
  return { items: out, pages };
}

export async function propIds(id: string): Promise<Record<string, string>> {
  const r = await send('GET', '/v1/pages/' + id);
  const m: Record<string, string> = {};
  const pr = (r.json && r.json.properties) || {};
  for (const k in pr) m[k] = pr[k].id;
  return m;
}

// Plain value of a page property, used to compare what was written with what is read back
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
// Reusable negative checks
// ---------------------------------------------------------------------------
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
export const getp = (id: string, o?: SendOptions) => send('GET', '/v1/pages/' + id, null, o);
export const prop = (id: string, pid: string, qs?: string, o?: SendOptions) =>
  send('GET', `/v1/pages/${id}/properties/${pid}` + (qs ? '?' + qs : ''), null, o);
export const patch = (id: string, body: unknown, o?: SendOptions) => send('PATCH', '/v1/pages/' + id, body, o);
export const move = (id: string, parentObj: unknown, o?: SendOptions) =>
  send('POST', `/v1/pages/${id}/move`, { parent: parentObj }, o);
export const trash = (id: string, token?: string) => send('PATCH', '/v1/pages/' + id, { in_trash: true }, { token });

export async function parent2(): Promise<string> {
  const j = await mkPage({ page_id: env('rootPageId') }, tpProps(uniq('QA parent2')));
  cv.set('parent2Id', j.id);
  track(j.id);
  return j.id;
}
const tpProps = (s: string) => ({ title: tp(s) });

export async function child(p: string, pageTitle?: string, extra?: Record<string, any>) {
  const j = await mkPage({ page_id: p }, tpProps(pageTitle || uniq('QA page')), extra);
  cv.set('pageId', j.id);
  cv.set('targetId', j.id);
  return j;
}

// Layer 1 + 3 on a chained request: exact status and, for errors, the Notion error code
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

// Layers 3 + 4 on a page object: contract values, metadata and Zod schema
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

// Layers 1 + 2 on a chained request: exact status, Content-Type and SLA
export function stepOk(r: SendResult, code: number, label: string, maxMs = PAGES_SLA_MS) {
  check(`${label} should return ${code}`, () => expect(r.code, 'status').to.eql(code));
  check(`${label} should return application/json within ${maxMs} ms`, () => {
    expect(String(r.headers.get('content-type'))).to.include('application/json');
    expect(r.ms).to.be.below(maxMs);
  });
}
