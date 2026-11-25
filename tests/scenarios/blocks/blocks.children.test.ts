// tests/scenarios/blocks/blocks.children.test.ts
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
} from '../../../core/utils/assertions';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { BlockChildrenQueryParams, BlocksAPI } from '../../../main/api/endpoints/blocksAPI';
import blocksDataset from '../../../main/api/resources/data/blocks_dataset.json';
import { BlockChildrenListSchema } from '../../../main/api/resources/schemas/blocksSchemas';
import {
  cleanupBlocksContext,
  createBlocksTestContext,
  createIsolatedBlockContainer,
  paragraphBlock,
  recordBlocksTelemetry,
  setupBlocksContext,
  throttleBlocksRequest,
} from '../../hooks/blocks/blocksHooks';

const UNASSIGNED_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

describe('Blocks API — GET /v1/blocks/:id/children (Retrieve Block Children)', () => {
  const blocksAPI = new BlocksAPI();
  const ctx = createBlocksTestContext();

  beforeAll(async () => {
    await setupBlocksContext(ctx, blocksAPI, { seedBlocks: true, suiteLabel: 'ChildrenSuite' });
  }, 60000);

  beforeEach(async () => {
    ctx.lastResponse = null;
    await throttleBlocksRequest();
  });

  afterEach((context) => {
    recordBlocksTelemetry(ctx, context.task.name);
  });

  afterAll(async () => {
    await cleanupBlocksContext(ctx, blocksAPI);
  }, 60000);

  // ============================================================================
  // Happy Path & Cursor Pagination Scenarios
  // ============================================================================
  it('TC_BLK_CHL_001 - [Happy Path] Retrieve children list on parent page with default pagination (200 OK)', async () => {
    const res = await blocksAPI.getChildren(ctx.parentPageId);
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const parsed = SchemaValidator.assertValid(BlockChildrenListSchema, res.data);
    expect(parsed.object).toBe('list');
    expect(parsed.type).toBe('block');
    expect(Array.isArray(parsed.results)).toBe(true);
    expect(typeof parsed.has_more).toBe('boolean');
  });

  it('TC_BLK_CHL_002 - [Happy Path] Traverse cursor-based pagination (page_size=1 & start_cursor) with non-overlapping IDs (200 OK)', async () => {
    const page1Res = await blocksAPI.getChildren(ctx.sandboxContainerId, { page_size: 1 });
    ctx.lastResponse = page1Res;

    expect(page1Res.status).toBe(200);
    assertCommonHeadersAndSla(page1Res);

    const page1 = SchemaValidator.assertValid(BlockChildrenListSchema, page1Res.data);
    expect(page1.results).toHaveLength(1);
    expect(page1.has_more).toBe(true);
    expect(typeof page1.next_cursor).toBe('string');

    const page1BlockId = page1.results[0].id;
    const nextCursor = page1.next_cursor as string;

    await throttleBlocksRequest();
    const page2Res = await blocksAPI.getChildren(ctx.sandboxContainerId, {
      page_size: 1,
      start_cursor: nextCursor,
    });
    expect(page2Res.status).toBe(200);
    assertCommonHeadersAndSla(page2Res);

    const page2 = SchemaValidator.assertValid(BlockChildrenListSchema, page2Res.data);
    expect(page2.results).toHaveLength(1);
    expect(page2.results[0].id).not.toBe(page1BlockId);
  });

  it('TC_BLK_CHL_003 - [Happy Path] Retrieve children of a childless paragraph block returns empty results: [] and has_more: false (200 OK)', async () => {
    const res = await blocksAPI.getChildren(ctx.activeBlockId);
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const parsed = SchemaValidator.assertValid(BlockChildrenListSchema, res.data);
    expect(parsed.results).toEqual([]);
    expect(parsed.has_more).toBe(false);
    expect(parsed.next_cursor).toBeNull();
  });

  it('TC_BLK_CHL_004 - [Happy Path] Retrieve direct nested children of a toggle block (200 OK)', async () => {
    const res = await blocksAPI.getChildren(ctx.nestedBlockId);
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const parsed = SchemaValidator.assertValid(BlockChildrenListSchema, res.data);
    expect(parsed.results.length).toBeGreaterThanOrEqual(1);
    expect(parsed.results[0].parent.block_id).toBe(ctx.nestedBlockId);
  });

  it('TC_BLK_CHL_015 - [E2E] Paginated block tree traversal across multiple cursor pages with zero duplicate IDs (E2E Flow 2)', async () => {
    const treeContainerId = await createIsolatedBlockContainer(ctx, blocksAPI, 'TC_BLK_CHL_015');
    await throttleBlocksRequest();

    const batch = Array.from({ length: 5 }, (_, i) => paragraphBlock(`Paginated Node ${i + 1}`));
    const appendRes = await blocksAPI.appendChildren(treeContainerId, { children: batch });
    expect(appendRes.status).toBe(200);

    const collectedIds: string[] = [];
    let cursor: string | null = null;
    let pagesTraversed = 0;

    do {
      await throttleBlocksRequest();
      const params: BlockChildrenQueryParams = cursor
        ? { page_size: 2, start_cursor: cursor }
        : { page_size: 2 };
      const pageRes = await blocksAPI.getChildren(treeContainerId, params);
      ctx.lastResponse = pageRes;

      expect(pageRes.status).toBe(200);
      assertCommonHeadersAndSla(pageRes);

      const pageData = SchemaValidator.assertValid(BlockChildrenListSchema, pageRes.data);
      for (const item of pageData.results) {
        collectedIds.push(item.id);
      }
      cursor = pageData.has_more ? pageData.next_cursor : null;
      pagesTraversed += 1;
    } while (cursor);

    expect(pagesTraversed).toBe(3);
    expect(collectedIds).toHaveLength(5);
    expect(new Set(collectedIds).size).toBe(5);
  });

  // ============================================================================
  // Negative Auth, Header & Identifier Validation Scenarios
  // ============================================================================
  it('TC_BLK_CHL_005a - [Negative] Reject children listing with invalid Bearer token (401 unauthorized)', async () => {
    const res = await blocksAPI.getChildren(ctx.parentPageId, undefined, {
      authType: 'bearer',
      bearerToken: 'ntn_forged_children_token_005',
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_BLK_CHL_005b - [Negative] Reject children listing without Authorization header (401 unauthorized)', async () => {
    const res = await blocksAPI.getChildren(ctx.parentPageId, undefined, { authType: 'none' });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_BLK_CHL_006 - [Negative] Reject children listing when Notion-Version header is omitted (400 missing_version)', async () => {
    const res = await blocksAPI.getChildren(ctx.parentPageId, undefined, {
      omitNotionVersion: true,
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'missing_version');
  });

  it('TC_BLK_CHL_007 - [Negative] Return 404 Not Found when listing children of non-existent block UUID', async () => {
    const res = await blocksAPI.getChildren(UNASSIGNED_UUID);
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 404, 'object_not_found');
  });

  it('TC_BLK_CHL_008 - [Negative] Reject children listing for syntactically invalid UUID (400 validation_error)', async () => {
    const res = await blocksAPI.getChildren('not-a-valid-uuid');
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_BLK_CHL_014 - [Boundary] Return 404 Not Found when listing children of all-zero nil UUID', async () => {
    const res = await blocksAPI.getChildren(NIL_UUID);
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 404, 'object_not_found');
  });

  // ============================================================================
  // Data-Driven Pagination Boundaries & Query Validation (blocks_dataset.json)
  // ============================================================================
  describe('Data-Driven Pagination Boundaries (blocks_dataset.json)', () => {
    for (const testCase of blocksDataset.paginationBoundaries) {
      it(`${testCase.caseId} - [${testCase.category}] ${testCase.description}`, async () => {
        const res = await blocksAPI.getChildren(
          ctx.parentPageId,
          testCase.params as BlockChildrenQueryParams
        );
        ctx.lastResponse = res;

        if (testCase.expectedStatus === 200) {
          expect(res.status).toBe(200);
          assertCommonHeadersAndSla(res);
          const parsed = SchemaValidator.assertValid(BlockChildrenListSchema, res.data);
          if (testCase.maxResults !== null) {
            expect(parsed.results.length).toBeLessThanOrEqual(testCase.maxResults);
          }
        } else {
          assertNotionErrorContract(
            res,
            testCase.expectedStatus,
            testCase.expectedCode ?? 'validation_error'
          );
        }
      });
    }
  });
});
