// tests/hooks/blocks/blocksHooks.ts
import { TimedAxiosResponse } from '../../../core/api/RequestManager';
import { DataFactory } from '../../../core/utils/dataFactory';
import { Logger } from '../../../core/utils/logger';
import { BlocksAPI } from '../../../main/api/endpoints/blocksAPI';
import { SearchAPI } from '../../../main/api/endpoints/searchAPI';
import { UUIDv4Regex } from '../../../main/api/resources/schemas/blocksSchemas';

export const BLOCKS_THROTTLE_MS = 350;

export interface BlocksTelemetryEntry {
  testName: string;
  status: number;
  durationMs: number;
}

export interface BlocksTestContext {
  parentPageId: string;
  createdBlockIds: string[];
  activeBlockId: string;
  nestedBlockId: string;
  todoBlockId: string;
  sandboxContainerId: string;
  lastResponse: TimedAxiosResponse | null;
  telemetry: BlocksTelemetryEntry[];
}

export interface SetupBlocksOptions {
  seedBlocks?: boolean;
  suiteLabel?: string;
}

interface RichTextSegment {
  type: 'text';
  text: { content: string };
}

const PLACEHOLDER_IDS = new Set(['', 'YOUR_SHARED_PARENT_PAGE_UUID', 'your_notion_page_id_here']);

/**
 * Factory creating an isolated, strongly-typed BlocksTestContext for each test suite.
 */
export function createBlocksTestContext(): BlocksTestContext {
  return {
    parentPageId: '',
    createdBlockIds: [],
    activeBlockId: '',
    nestedBlockId: '',
    todoBlockId: '',
    sandboxContainerId: '',
    lastResponse: null,
    telemetry: [],
  };
}

/**
 * Enforces Notion API's ~3 req/s rate limit between consecutive test requests.
 */
export async function throttleBlocksRequest(delayMs = BLOCKS_THROTTLE_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Reusable Notion Block payload builders (strictly typed without `any`).
 */
export function richText(content: string): RichTextSegment[] {
  return [{ type: 'text', text: { content } }];
}

export function paragraphBlock(content: string): Record<string, unknown> {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: richText(content) },
  };
}

export function headingBlock(level: 1 | 2 | 3, content: string): Record<string, unknown> {
  const key = `heading_${level}`;
  return {
    object: 'block',
    type: key,
    [key]: { rich_text: richText(content) },
  };
}

export function todoBlock(content: string, checked = false): Record<string, unknown> {
  return {
    object: 'block',
    type: 'to_do',
    to_do: { rich_text: richText(content), checked },
  };
}

export function toggleBlock(
  content: string,
  children?: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    object: 'block',
    type: 'toggle',
    toggle: {
      rich_text: richText(content),
      ...(children ? { children } : {}),
    },
  };
}

/**
 * Resolves the root parent page UUID from environment variables used in Karen's Lab 03 suites
 * (PARENT_PAGE_ID -> PAGE_ID -> NOTION_PAGE_ID), falling back to POST /v1/search when unset.
 */
export async function resolveParentPageId(): Promise<string> {
  const envCandidate = (
    process.env.PARENT_PAGE_ID ||
    process.env.PAGE_ID ||
    process.env.NOTION_PAGE_ID ||
    ''
  ).trim();

  if (envCandidate && !PLACEHOLDER_IDS.has(envCandidate)) {
    if (!UUIDv4Regex.test(envCandidate)) {
      throw new Error(
        `[BlocksHooks] Invalid parent page UUID in environment variable: "${envCandidate}"`
      );
    }
    Logger.debug(`[BlocksHooks] Resolved parentPageId from environment: ${envCandidate}`);
    return envCandidate;
  }

  Logger.info('[BlocksHooks] PARENT_PAGE_ID not configured; discovering shared page via SearchAPI');
  const searchAPI = new SearchAPI();
  const searchRes = await searchAPI.search({
    filter: { value: 'page', property: 'object' },
    page_size: 1,
  });

  if (
    searchRes.status !== 200 ||
    !Array.isArray(searchRes.data?.results) ||
    searchRes.data.results.length === 0
  ) {
    throw new Error(
      `[BlocksHooks] Unable to resolve parentPageId via SearchAPI (status ${searchRes.status}). Set PARENT_PAGE_ID in .env.`
    );
  }

  const discoveredId = String(searchRes.data.results[0].id);
  if (!UUIDv4Regex.test(discoveredId)) {
    throw new Error(`[BlocksHooks] Discovered page ID is not a valid UUIDv4: "${discoveredId}"`);
  }

  Logger.info(`[BlocksHooks] Discovered parentPageId via SearchAPI: ${discoveredId}`);
  return discoveredId;
}

/**
 * Provisions an isolated toggle container block under ctx.parentPageId and tracks it for cleanup.
 */
export async function createIsolatedBlockContainer(
  ctx: BlocksTestContext,
  blocksAPI: BlocksAPI,
  label: string
): Promise<string> {
  await throttleBlocksRequest();
  const containerTitle = DataFactory.title(`QA Blocks Container - ${label}`);
  const res = await blocksAPI.appendChildren(ctx.parentPageId, {
    children: [toggleBlock(containerTitle)],
  });

  if (res.status !== 200 || !Array.isArray(res.data?.results) || res.data.results.length === 0) {
    Logger.error('[BlocksHooks] Failed to provision isolated container block', {
      label,
      status: res.status,
      body: res.data,
    });
    throw new Error(`createIsolatedBlockContainer("${label}") failed with status ${res.status}`);
  }

  const containerId = String(res.data.results[0].id);
  ctx.createdBlockIds.push(containerId);
  Logger.debug(`[BlocksHooks] Created isolated container (${label}): ${containerId}`);
  return containerId;
}

/**
 * Suite-level precondition hook (beforeAll): validates parentPageId and optionally seeds
 * an isolated sandbox container with active paragraph, nested toggle, and to_do blocks.
 */
export async function setupBlocksContext(
  ctx: BlocksTestContext,
  blocksAPI: BlocksAPI,
  options: SetupBlocksOptions = {}
): Promise<BlocksTestContext> {
  ctx.parentPageId = await resolveParentPageId();

  if (options.seedBlocks) {
    const suiteLabel = options.suiteLabel || 'Sandbox';
    ctx.sandboxContainerId = await createIsolatedBlockContainer(ctx, blocksAPI, suiteLabel);

    await throttleBlocksRequest();
    const seedRes = await blocksAPI.appendChildren(ctx.sandboxContainerId, {
      children: [
        paragraphBlock(`Seed Paragraph - ${DataFactory.text(6)}`),
        toggleBlock(`Seed Toggle - ${DataFactory.text(6)}`, [
          paragraphBlock('Nested Child inside Seed Toggle'),
        ]),
        todoBlock(`Seed ToDo - ${DataFactory.text(6)}`, false),
      ],
    });

    if (
      seedRes.status !== 200 ||
      !Array.isArray(seedRes.data?.results) ||
      seedRes.data.results.length < 3
    ) {
      Logger.error('[BlocksHooks] Failed to seed precondition blocks', {
        status: seedRes.status,
        body: seedRes.data,
      });
      throw new Error(`setupBlocksContext seed failed with status ${seedRes.status}`);
    }

    ctx.activeBlockId = String(seedRes.data.results[0].id);
    ctx.nestedBlockId = String(seedRes.data.results[1].id);
    ctx.todoBlockId = String(seedRes.data.results[2].id);

    Logger.info(
      `[BlocksHooks] Seeded sandbox (${suiteLabel}): container=${ctx.sandboxContainerId}, active=${ctx.activeBlockId}, nested=${ctx.nestedBlockId}, todo=${ctx.todoBlockId}`
    );
  }

  return ctx;
}

/**
 * Per-test telemetry hook (afterEach): records HTTP status and latency and logs via Logger.debug.
 */
export function recordBlocksTelemetry(ctx: BlocksTestContext, testName: string): void {
  if (!ctx.lastResponse) {
    return;
  }

  const entry: BlocksTelemetryEntry = {
    testName,
    status: ctx.lastResponse.status,
    durationMs: ctx.lastResponse.durationMs,
  };
  ctx.telemetry.push(entry);

  Logger.debug(
    `[BlocksTelemetry] ${entry.testName} -> HTTP ${entry.status} (${entry.durationMs}ms)`
  );
}

/**
 * Suite-level postcondition hook (afterAll): archives/deletes all tracked createdBlockIds
 * via BlocksAPI.deleteBlock() and logs a teardown summary via Logger.info.
 */
export async function cleanupBlocksContext(
  ctx: BlocksTestContext,
  blocksAPI: BlocksAPI
): Promise<void> {
  const totalTracked = ctx.createdBlockIds.length;
  let deletedCount = 0;
  let failedCount = 0;

  for (const blockId of ctx.createdBlockIds) {
    try {
      await throttleBlocksRequest();
      const res = await blocksAPI.deleteBlock(blockId);
      if (res.status === 200) {
        deletedCount += 1;
        Logger.debug(`[BlocksHooks] Archived block during teardown: ${blockId}`);
      } else {
        failedCount += 1;
        Logger.warn(`[BlocksHooks] Teardown delete returned HTTP ${res.status} for ${blockId}`);
      }
    } catch (error) {
      failedCount += 1;
      Logger.warn(`[BlocksHooks] Exception while archiving block ${blockId}`, error);
    }
  }

  const telemetryCount = ctx.telemetry.length;
  ctx.createdBlockIds.length = 0;
  ctx.telemetry.length = 0;
  ctx.lastResponse = null;

  Logger.info(
    `[BlocksHooks] Teardown complete: tracked=${totalTracked}, archived=${deletedCount}, failed=${failedCount}, telemetryEntries=${telemetryCount}`
  );
}
