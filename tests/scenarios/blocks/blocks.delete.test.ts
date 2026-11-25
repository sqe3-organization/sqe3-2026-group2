// tests/scenarios/blocks/blocks.delete.test.ts
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
} from '../../../core/utils/assertions';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { BlocksAPI } from '../../../main/api/endpoints/blocksAPI';
import {
  BlockChildrenListSchema,
  BlockObject,
  BlockObjectSchema,
  UUIDv4Regex,
} from '../../../main/api/resources/schemas/blocksSchemas';
import {
  cleanupBlocksContext,
  createBlocksTestContext,
  createIsolatedBlockContainer,
  paragraphBlock,
  recordBlocksTelemetry,
  richText,
  setupBlocksContext,
  throttleBlocksRequest,
  toggleBlock,
} from '../../hooks/blocks/blocksHooks';

interface ParagraphBlockResponse extends BlockObject {
  paragraph: {
    rich_text: Array<{ text: { content: string } }>;
  };
}

const UNASSIGNED_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const HEX_31_CHAR = 'f47ac10b58cc4372a5670e02b2c3d47';

describe('Blocks API — DELETE /v1/blocks/:id (Delete Block & Lifecycle E2E)', () => {
  const blocksAPI = new BlocksAPI();
  const ctx = createBlocksTestContext();

  beforeAll(async () => {
    await setupBlocksContext(ctx, blocksAPI, { seedBlocks: true, suiteLabel: 'DeleteSuite' });
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
  // Happy Path & Cascade Deletion Scenarios
  // ============================================================================
  it('TC_BLK_DEL_001 - [Happy Path] Soft-delete a pre-created block via DELETE /v1/blocks/:id (200 OK, in_trash: true)', async () => {
    const createRes = await blocksAPI.appendChildren(ctx.sandboxContainerId, {
      children: [paragraphBlock('Disposable block for TC_BLK_DEL_001')],
    });
    expect(createRes.status).toBe(200);
    const createdList = SchemaValidator.assertValid(BlockChildrenListSchema, createRes.data);
    const delId = createdList.results[0].id;

    await throttleBlocksRequest();
    const res = await blocksAPI.deleteBlock(delId);
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const deleted = SchemaValidator.assertValid(BlockObjectSchema, res.data);
    expect(deleted.id).toBe(delId);
    expect(deleted.in_trash).toBe(true);
    expect(deleted.archived).toBe(true);
  });

  it('TC_BLK_DEL_002 - [Happy Path] Verify deleted block no longer appears in parent children list (200 OK)', async () => {
    const containerId = await createIsolatedBlockContainer(ctx, blocksAPI, 'TC_BLK_DEL_002');
    await throttleBlocksRequest();

    const createRes = await blocksAPI.appendChildren(containerId, {
      children: [paragraphBlock('Keep Me'), paragraphBlock('Delete Me')],
    });
    expect(createRes.status).toBe(200);
    const createdList = SchemaValidator.assertValid(BlockChildrenListSchema, createRes.data);
    const keepId = createdList.results[0].id;
    const deleteId = createdList.results[1].id;

    await throttleBlocksRequest();
    const delRes = await blocksAPI.deleteBlock(deleteId);
    ctx.lastResponse = delRes;
    expect(delRes.status).toBe(200);

    await throttleBlocksRequest();
    const childrenRes = await blocksAPI.getChildren(containerId);
    expect(childrenRes.status).toBe(200);
    const remaining = SchemaValidator.assertValid(BlockChildrenListSchema, childrenRes.data);
    const remainingIds = remaining.results.map((block) => block.id);
    expect(remainingIds).toContain(keepId);
    expect(remainingIds).not.toContain(deleteId);
  });

  it('TC_BLK_DEL_003 - [Happy Path] Delete parent toggle block with nested children and query GET /children', async () => {
    const createRes = await blocksAPI.appendChildren(ctx.sandboxContainerId, {
      children: [toggleBlock('Parent Toggle To Delete', [paragraphBlock('Nested Child Block')])],
    });
    expect(createRes.status).toBe(200);
    const createdList = SchemaValidator.assertValid(BlockChildrenListSchema, createRes.data);
    const parentToggleId = createdList.results[0].id;

    await throttleBlocksRequest();
    const delRes = await blocksAPI.deleteBlock(parentToggleId);
    expect(delRes.status).toBe(200);
    const deleted = SchemaValidator.assertValid(BlockObjectSchema, delRes.data);
    expect(deleted.in_trash).toBe(true);

    await throttleBlocksRequest();
    const childrenRes = await blocksAPI.getChildren(parentToggleId);
    ctx.lastResponse = childrenRes;

    assertCommonHeadersAndSla(childrenRes);
    // Preserves Lab 01/03 contract discrepancy assertion: expects 200 OK on trashed parent lookup
    expect(childrenRes.status).toBe(200);
  });

  // ============================================================================
  // Negative Auth, Header & Identifier Validation Scenarios
  // ============================================================================
  it('TC_BLK_DEL_004a - [Negative] Reject delete with invalid Bearer token (401 unauthorized)', async () => {
    const res = await blocksAPI.deleteBlock(UNASSIGNED_UUID, {
      authType: 'bearer',
      bearerToken: 'ntn_forged_delete_token_004',
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_BLK_DEL_004b - [Negative] Reject delete without Authorization header (401 unauthorized)', async () => {
    const res = await blocksAPI.deleteBlock(UNASSIGNED_UUID, { authType: 'none' });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_BLK_DEL_005 - [Negative] Reject delete when Notion-Version header is omitted (400 missing_version)', async () => {
    const res = await blocksAPI.deleteBlock(UNASSIGNED_UUID, { omitNotionVersion: true });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'missing_version');
  });

  it('TC_BLK_DEL_007 - [Negative] Return 404 Not Found for non-existent UUID', async () => {
    const res = await blocksAPI.deleteBlock(UNASSIGNED_UUID);
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 404, 'object_not_found');
  });

  it('TC_BLK_DEL_008 - [Negative] Reject delete with syntactically invalid UUID (400 validation_error)', async () => {
    const res = await blocksAPI.deleteBlock('not-a-valid-uuid');
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_BLK_DEL_009 - [Boundary] Reject content update on an already-deleted block (400 validation_error)', async () => {
    const createRes = await blocksAPI.appendChildren(ctx.sandboxContainerId, {
      children: [paragraphBlock('Block for already-deleted check')],
    });
    expect(createRes.status).toBe(200);
    const createdList = SchemaValidator.assertValid(BlockChildrenListSchema, createRes.data);
    const delId = createdList.results[0].id;

    await throttleBlocksRequest();
    const delRes = await blocksAPI.deleteBlock(delId);
    expect(delRes.status).toBe(200);

    await throttleBlocksRequest();
    const res = await blocksAPI.updateBlock(delId, {
      paragraph: { rich_text: richText('Cannot edit trashed block') },
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_BLK_DEL_010a - [Boundary] Return 404 Not Found for all-zero nil UUID', async () => {
    const res = await blocksAPI.deleteBlock(NIL_UUID);
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 404, 'object_not_found');
  });

  it('TC_BLK_DEL_010b - [Boundary] Reject delete with off-by-one 31-char hex UUID (400 validation_error)', async () => {
    const res = await blocksAPI.deleteBlock(HEX_31_CHAR);
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  // ============================================================================
  // Chained E2E Block Lifecycle Workflows (Preserved from Lab 03 Activity #6)
  // ============================================================================
  it('TC_BLK_DEL_012 - [E2E] Full block lifecycle: Append -> List -> Retrieve -> Update -> Delete -> Verify in_trash (E2E Flow 1)', async () => {
    const initialText = 'E2E Step 1 Initial Paragraph Text';
    const updatedText = 'E2E Step 4 Updated Paragraph Text';
    const e2eContainerId = await createIsolatedBlockContainer(ctx, blocksAPI, 'TC_BLK_DEL_012');

    // Step 1: Append child paragraph
    await throttleBlocksRequest();
    const appendRes = await blocksAPI.appendChildren(e2eContainerId, {
      children: [paragraphBlock(initialText)],
    });
    expect(appendRes.status).toBe(200);
    assertCommonHeadersAndSla(appendRes);
    const appended = SchemaValidator.assertValid(BlockChildrenListSchema, appendRes.data);
    expect(appended.results).toHaveLength(1);
    const e2eBlockId = appended.results[0].id;
    expect(e2eBlockId).toMatch(UUIDv4Regex);

    // Step 2: Verify presence in parent children list
    await throttleBlocksRequest();
    const listBeforeRes = await blocksAPI.getChildren(e2eContainerId);
    expect(listBeforeRes.status).toBe(200);
    const listBefore = SchemaValidator.assertValid(BlockChildrenListSchema, listBeforeRes.data);
    expect(listBefore.results.map((block) => block.id)).toContain(e2eBlockId);

    // Step 3: Retrieve block by ID and verify baseline text & parent pointer
    await throttleBlocksRequest();
    const getRes = await blocksAPI.getBlock(e2eBlockId);
    expect(getRes.status).toBe(200);
    const fetched = SchemaValidator.assertValid(
      BlockObjectSchema,
      getRes.data
    ) as ParagraphBlockResponse;
    expect(fetched.id).toBe(e2eBlockId);
    expect(fetched.parent.block_id).toBe(e2eContainerId);
    expect(fetched.paragraph.rich_text[0].text.content).toBe(initialText);

    // Step 4: Update block content and confirm via follow-up GET
    await throttleBlocksRequest();
    const updateRes = await blocksAPI.updateBlock(e2eBlockId, {
      paragraph: { rich_text: richText(updatedText) },
    });
    expect(updateRes.status).toBe(200);
    const updated = SchemaValidator.assertValid(
      BlockObjectSchema,
      updateRes.data
    ) as ParagraphBlockResponse;
    expect(updated.paragraph.rich_text[0].text.content).toBe(updatedText);

    // Step 5: Soft-delete block
    await throttleBlocksRequest();
    const deleteRes = await blocksAPI.deleteBlock(e2eBlockId);
    expect(deleteRes.status).toBe(200);
    const deleted = SchemaValidator.assertValid(BlockObjectSchema, deleteRes.data);
    expect(deleted.in_trash).toBe(true);

    // Step 6: Verify absence from active children & in_trash persistence via GET
    await throttleBlocksRequest();
    const listAfterRes = await blocksAPI.getChildren(e2eContainerId);
    expect(listAfterRes.status).toBe(200);
    const listAfter = SchemaValidator.assertValid(BlockChildrenListSchema, listAfterRes.data);
    expect(listAfter.results.map((block) => block.id)).not.toContain(e2eBlockId);

    await throttleBlocksRequest();
    const finalGetRes = await blocksAPI.getBlock(e2eBlockId);
    ctx.lastResponse = finalGetRes;
    expect(finalGetRes.status).toBe(200);
    assertCommonHeadersAndSla(finalGetRes);
    const finalBlock = SchemaValidator.assertValid(BlockObjectSchema, finalGetRes.data);
    expect(finalBlock.in_trash).toBe(true);
    expect(finalBlock.archived).toBe(true);
  });

  it('TC_BLK_DEL_013 - [E2E] Ordered insertion & trash restore: Insert B after A, delete B, restore B, assert [A, B, C] order (E2E Flow 3)', async () => {
    const orderContainerId = await createIsolatedBlockContainer(ctx, blocksAPI, 'TC_BLK_DEL_013');

    // Step 1: Append A and C
    await throttleBlocksRequest();
    const step1Res = await blocksAPI.appendChildren(orderContainerId, {
      children: [paragraphBlock('A'), paragraphBlock('C')],
    });
    expect(step1Res.status).toBe(200);
    const step1List = SchemaValidator.assertValid(BlockChildrenListSchema, step1Res.data);
    const blockAId = step1List.results[0].id;

    // Step 2: Insert B after A
    await throttleBlocksRequest();
    const step2Res = await blocksAPI.appendChildren(orderContainerId, {
      children: [paragraphBlock('B')],
      after: blockAId,
    });
    expect(step2Res.status).toBe(200);
    const step2List = SchemaValidator.assertValid(BlockChildrenListSchema, step2Res.data);
    const blockBId = step2List.results[0].id;

    // Step 3: Delete B
    await throttleBlocksRequest();
    const step3Del = await blocksAPI.deleteBlock(blockBId);
    expect(step3Del.status).toBe(200);

    // Step 4: Restore B via PATCH { in_trash: false }
    await throttleBlocksRequest();
    const step4Restore = await blocksAPI.updateBlock(blockBId, { in_trash: false });
    expect(step4Restore.status).toBe(200);
    const restored = SchemaValidator.assertValid(BlockObjectSchema, step4Restore.data);
    expect(restored.in_trash).toBe(false);

    // Step 5: Re-list children and assert [A, B, C] order (preserves Lab 03 restoration order check)
    await throttleBlocksRequest();
    const listRes = await blocksAPI.getChildren(orderContainerId);
    ctx.lastResponse = listRes;

    expect(listRes.status).toBe(200);
    assertCommonHeadersAndSla(listRes);
    const finalList = SchemaValidator.assertValid(BlockChildrenListSchema, listRes.data);
    const actualOrder = finalList.results.map(
      (block) => (block as ParagraphBlockResponse).paragraph.rich_text[0].text.content
    );
    expect(actualOrder).toEqual(['A', 'B', 'C']);
  });
});
