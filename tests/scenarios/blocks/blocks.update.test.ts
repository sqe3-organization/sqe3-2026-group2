// tests/scenarios/blocks/blocks.update.test.ts
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
} from '../../../core/utils/assertions';
import { DataFactory } from '../../../core/utils/dataFactory';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { BlocksAPI } from '../../../main/api/endpoints/blocksAPI';
import blocksDataset from '../../../main/api/resources/data/blocks_dataset.json';
import {
  BlockChildrenListSchema,
  BlockObject,
  BlockObjectSchema,
} from '../../../main/api/resources/schemas/blocksSchemas';
import {
  cleanupBlocksContext,
  createBlocksTestContext,
  paragraphBlock,
  recordBlocksTelemetry,
  richText,
  setupBlocksContext,
  throttleBlocksRequest,
} from '../../hooks/blocks/blocksHooks';

interface ParagraphBlockResponse extends BlockObject {
  paragraph: {
    rich_text: Array<{ text: { content: string } }>;
  };
}

interface TodoBlockResponse extends BlockObject {
  to_do: {
    rich_text: Array<{ text: { content: string } }>;
    checked: boolean;
  };
}

const UNASSIGNED_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const HEX_31_CHAR = 'f47ac10b58cc4372a5670e02b2c3d47';

describe('Blocks API — PATCH /v1/blocks/:id (Update a Block)', () => {
  const blocksAPI = new BlocksAPI();
  const ctx = createBlocksTestContext();

  beforeAll(async () => {
    await setupBlocksContext(ctx, blocksAPI, { seedBlocks: true, suiteLabel: 'UpdateSuite' });
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
  // Happy Path & Data Integrity Update Scenarios
  // ============================================================================
  it('TC_BLK_UPD_001 - [Happy Path] Update paragraph text content and verify persistence via follow-up GET (200 OK)', async () => {
    const updatedText = `Updated Paragraph Content - ${DataFactory.text(8)}`;
    const res = await blocksAPI.updateBlock(ctx.activeBlockId, {
      paragraph: { rich_text: richText(updatedText) },
    });
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const updated = SchemaValidator.assertValid(
      BlockObjectSchema,
      res.data
    ) as ParagraphBlockResponse;
    expect(updated.paragraph.rich_text[0].text.content).toBe(updatedText);

    await throttleBlocksRequest();
    const getRes = await blocksAPI.getBlock(ctx.activeBlockId);
    expect(getRes.status).toBe(200);
    const persisted = SchemaValidator.assertValid(
      BlockObjectSchema,
      getRes.data
    ) as ParagraphBlockResponse;
    expect(persisted.paragraph.rich_text[0].text.content).toBe(updatedText);
  });

  it('TC_BLK_UPD_002 - [Happy Path] Toggle to_do checked state (true/false) and verify persistence (200 OK)', async () => {
    const resTrue = await blocksAPI.updateBlock(ctx.todoBlockId, {
      to_do: { checked: true },
    });
    ctx.lastResponse = resTrue;

    expect(resTrue.status).toBe(200);
    assertCommonHeadersAndSla(resTrue);

    const checkedTodo = SchemaValidator.assertValid(
      BlockObjectSchema,
      resTrue.data
    ) as TodoBlockResponse;
    expect(checkedTodo.to_do.checked).toBe(true);

    await throttleBlocksRequest();
    const resFalse = await blocksAPI.updateBlock(ctx.todoBlockId, {
      to_do: { checked: false },
    });
    expect(resFalse.status).toBe(200);

    const uncheckedTodo = SchemaValidator.assertValid(
      BlockObjectSchema,
      resFalse.data
    ) as TodoBlockResponse;
    expect(uncheckedTodo.to_do.checked).toBe(false);
  });

  it('TC_BLK_UPD_003 - [Boundary] Archive (in_trash: true) and unarchive (in_trash: false) a pre-created block via PATCH (200 OK)', async () => {
    const createRes = await blocksAPI.appendChildren(ctx.sandboxContainerId, {
      children: [paragraphBlock('Block for Archive/Unarchive cycle')],
    });
    expect(createRes.status).toBe(200);
    const createdList = SchemaValidator.assertValid(BlockChildrenListSchema, createRes.data);
    const cycleBlockId = createdList.results[0].id;

    await throttleBlocksRequest();
    const archiveRes = await blocksAPI.updateBlock(cycleBlockId, { in_trash: true });
    expect(archiveRes.status).toBe(200);
    const archived = SchemaValidator.assertValid(BlockObjectSchema, archiveRes.data);
    expect(archived.in_trash).toBe(true);

    await throttleBlocksRequest();
    const restoreRes = await blocksAPI.updateBlock(cycleBlockId, { in_trash: false });
    ctx.lastResponse = restoreRes;

    expect(restoreRes.status).toBe(200);
    assertCommonHeadersAndSla(restoreRes);

    const restored = SchemaValidator.assertValid(BlockObjectSchema, restoreRes.data);
    expect(restored.in_trash).toBe(false);
    expect(restored.archived).toBe(false);
  });

  it('TC_BLK_UPD_012 - [Boundary] Update paragraph with exact 2000-char string (200 OK) and reject 2001-char overflow (400)', async () => {
    const exact2000 = 'u'.repeat(2000);
    const resOk = await blocksAPI.updateBlock(ctx.activeBlockId, {
      paragraph: { rich_text: richText(exact2000) },
    });
    ctx.lastResponse = resOk;

    expect(resOk.status).toBe(200);
    assertCommonHeadersAndSla(resOk);

    const updated = SchemaValidator.assertValid(
      BlockObjectSchema,
      resOk.data
    ) as ParagraphBlockResponse;
    expect(updated.paragraph.rich_text[0].text.content).toHaveLength(2000);

    await throttleBlocksRequest();
    const over2001 = 'u'.repeat(2001);
    const resErr = await blocksAPI.updateBlock(ctx.activeBlockId, {
      paragraph: { rich_text: richText(over2001) },
    });
    assertNotionErrorContract(resErr, 400, 'validation_error');
  });

  // ============================================================================
  // Negative Auth & Header Validation Scenarios
  // ============================================================================
  it('TC_BLK_UPD_004a - [Negative] Reject update with invalid Bearer token (401 unauthorized)', async () => {
    const res = await blocksAPI.updateBlock(
      UNASSIGNED_UUID,
      { paragraph: { rich_text: [] } },
      { authType: 'bearer', bearerToken: 'ntn_forged_update_token_004' }
    );
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_BLK_UPD_004b - [Negative] Reject update without Authorization header (401 unauthorized)', async () => {
    const res = await blocksAPI.updateBlock(
      UNASSIGNED_UUID,
      { paragraph: { rich_text: [] } },
      { authType: 'none' }
    );
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_BLK_UPD_005 - [Negative] Reject update when Notion-Version header is omitted (400 missing_version)', async () => {
    const res = await blocksAPI.updateBlock(
      UNASSIGNED_UUID,
      { paragraph: { rich_text: [] } },
      { omitNotionVersion: true }
    );
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'missing_version');
  });

  // ============================================================================
  // Negative Identifier & Malformed JSON Scenarios
  // ============================================================================
  it('TC_BLK_UPD_007 - [Negative] Return 404 Not Found for non-existent UUID', async () => {
    const res = await blocksAPI.updateBlock(UNASSIGNED_UUID, {
      paragraph: { rich_text: richText('Updated') },
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 404, 'object_not_found');
  });

  it('TC_BLK_UPD_008 - [Negative] Reject update with syntactically invalid UUID (400 validation_error)', async () => {
    const res = await blocksAPI.updateBlock('not-a-valid-uuid', {
      paragraph: { rich_text: richText('Updated') },
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_BLK_UPD_014 - [Boundary] Reject update with off-by-one 31-char hex UUID (400 validation_error)', async () => {
    const res = await blocksAPI.updateBlock(HEX_31_CHAR, {
      paragraph: { rich_text: richText('Updated') },
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_BLK_UPD_010 - [Negative] Reject update with malformed raw JSON body (400 invalid_json)', async () => {
    const res = await blocksAPI.updateBlock(ctx.parentPageId, '{"paragraph": broken_json');
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'invalid_json');
  });

  // ============================================================================
  // Data-Driven Invalid Update Payloads (blocks_dataset.json)
  // ============================================================================
  describe('Data-Driven Invalid Update Payloads (blocks_dataset.json)', () => {
    for (const testCase of blocksDataset.invalidUpdatePayloads) {
      it(`${testCase.caseId} - [${testCase.category}] ${testCase.description}`, async () => {
        const targetId = testCase.targetBlock === 'to_do' ? ctx.todoBlockId : ctx.activeBlockId;
        const res = await blocksAPI.updateBlock(
          targetId,
          testCase.payload as Record<string, unknown>
        );
        ctx.lastResponse = res;

        assertNotionErrorContract(res, testCase.expectedStatus, testCase.expectedCode);
      });
    }
  });
});
