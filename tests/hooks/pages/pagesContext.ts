import { expect } from 'vitest';
import { appendFileSync } from 'node:fs';
import { TimedAxiosResponse } from '../../../core/api/RequestManager';
import { Logger } from '../../../core/utils/logger';
import { PageRequestOptions } from '../../../main/api/endpoints/pagesAPI';

export type PageResponse = TimedAxiosResponse<any>;

export interface MainRequest {
  body: unknown;
  options: PageRequestOptions;
  removeHeader: (name: string) => void;
  setHeader: (name: string, value: string) => void;
}

export type MainCall = (req: MainRequest) => Promise<PageResponse>;

interface CheckResult {
  name: string;
  error?: string;
}

const noMainRequest: MainCall = async () => {
  throw new Error('This context has no request under test (E2E flow)');
};

export class CaseContext {
  vars = new Map<string, string>([['tracked', '[]']]);
  checks: CheckResult[] = [];
  request: MainRequest;

  constructor(public id: string, private readonly call: MainCall = noMainRequest, init?: Partial<Pick<MainRequest, 'body' | 'options'>>) {
    const options: PageRequestOptions = { ...(init?.options ?? {}) };
    this.request = {
      body: init?.body ?? '{}',
      options,
      removeHeader: (name) => {
        if (name.toLowerCase() === 'notion-version') options.omitNotionVersion = true;
        else if (name.toLowerCase() === 'authorization') options.noAuth = true;
        else if (options.headers) delete options.headers[name];
      },
      setHeader: (name, value) => {
        const key = name.toLowerCase();
        if (key === 'notion-version') {
          options.notionVersion = value;
          return;
        }
        if (key === 'authorization') options.noAuth = true;
        options.headers = { ...(options.headers ?? {}), [name]: value };
      },
    };
  }

  async sendMain(): Promise<PageResponse> {
    const res = await this.call(this.request);
    Logger.debug(`[PagesContext] ${this.id} -> ${res.status} (${res.durationMs} ms)`);
    return res;
  }
}

let current: CaseContext | null = null;
const ctx = (): CaseContext => {
  if (!current) throw new Error('startCase() must be called first');
  return current;
};

export function startCase(id: string, call: MainCall, init?: Partial<Pick<MainRequest, 'body' | 'options'>>): CaseContext {
  current = new CaseContext(id, call, init);
  return current;
}

export function startFlow(id: string): CaseContext {
  current = new CaseContext(id);
  return current;
}

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

export function check(name: string, fn: () => void) {
  try {
    fn();
    ctx().checks.push({ name });
  } catch (e: any) {
    ctx().checks.push({ name, error: e?.message ?? String(e) });
  }
}

export function assertChecks() {
  const c = ctx();
  const failed = c.checks.filter((x) => x.error);
  const summary = failed.map((f) => `  ✗ ${f.name}: ${f.error}`).join('\n');
  // Optional machine-readable log of every check (PAGES_CHECK_LOG=path)
  if (process.env.PAGES_CHECK_LOG) appendFileSync(process.env.PAGES_CHECK_LOG, JSON.stringify({ id: c.id, checks: c.checks }) + '\n');
  if (failed.length) Logger.warn(`[PagesContext] ${c.id}: ${failed.length} of ${c.checks.length} checks failed`);
  else Logger.debug(`[PagesContext] ${c.id}: ${c.checks.length} checks passed`);
  expect(c.checks.length, `${c.id} ran no checks`).toBeGreaterThan(0);
  expect(failed.length, `${c.id}: ${failed.length} of ${c.checks.length} checks failed\n${summary}`).toBe(0);
}

export function setBody(o: unknown) {
  const raw = typeof o === 'string' ? o : JSON.stringify(o);
  cv.set('lastBody', raw);
  ctx().request.body = raw;
}

export function track(id: string) {
  const a = JSON.parse(cv.get('tracked') || '[]');
  a.push(id);
  cv.set('tracked', JSON.stringify(a));
}
