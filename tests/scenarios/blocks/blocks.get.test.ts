// tests/scenarios/blocks/blocks.get.test.ts
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
} from '../../../core/utils/assertions';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { BlocksAPI } from '../../../main/api/endpoints/blocksAPI';
import blocksDataset from '../../../main/api/resources/data/blocks_dataset.json';
import {
  BlockChildrenListSchema,
  BlockObject,
  BlockObjectSchema,
  CompactHex32Regex,
  NotionErrorSchema,
  UUIDv4Regex,
} from '../../../main/api/resources/schemas/blocksSchemas';
import {
  cleanupBlocksContext,
  createBlocksTestContext,
  paragraphBlock,
  recordBlocksTelemetry,
  setupBlocksContext,
  throttleBlocksRequest,
} from '../../hooks/blocks/blocksHooks';

interface ParagraphBlockResponse extends BlockObject {
  paragraph: {
    rich_text: Array<{ text: { content: string } }>;
  };
}

interface ToggleBlockResponse extends BlockObject {
  toggle: {
    rich_text: Array<{ text: { content: string } }>;
    children?: unknown[];
  };
}

describe('Blocks API — GET /v1/blocks/:id (Retrieve a Block)', () => {
  const blocksAPI = new BlocksAPI();
  const ctx = createBlocksTestContext();
  let compactRootBlockId = '';

  beforeAll(async () => {
    await setupBlocksContext(ctx, blocksAPI, { seedBlocks: true, suiteLabel: 'GetSuite' });
    compactRootBlockId = ctx.parentPageId.replace(/-/g, '');
    expect(compactRootBlockId).toMatch(CompactHex32Regex);
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
  // Happy Path & Boundary Retrieval Scenarios
  // ============================================================================
  it('TC_BLK_GET_001 - [Happy Path] Retrieve pre-created paragraph block by 36-char UUIDv4 and compact 32-char hex ID (200 OK)', async () => {
    const resHyphenated = await blocksAPI.getBlock(ctx.activeBlockId);
    ctx.lastResponse = resHyphenated;

    expect(resHyphenated.status).toBe(200);
    assertCommonHeadersAndSla(resHyphenated);

    const hyphenatedBlock = SchemaValidator.assertValid(
      BlockObjectSchema,
      resHyphenated.data
    ) as ParagraphBlockResponse;
    expect(hyphenatedBlock.id).toBe(ctx.activeBlockId);
    expect(hyphenatedBlock.type).toBe('paragraph');

    const compactId = ctx.activeBlockId.replace(/-/g, '');
    expect(compactId).toMatch(CompactHex32Regex);

    await throttleBlocksRequest();
    const resCompact = await blocksAPI.getBlock(compactId);
    expect(resCompact.status).toBe(200);

    const compactBlock = SchemaValidator.assertValid(
      BlockObjectSchema,
      resCompact.data
    ) as ParagraphBlockResponse;
    expect(compactBlock.id).toBe(ctx.activeBlockId);
    expect(compactBlock.paragraph.rich_text[0].text.content).toBe(
      hyphenatedBlock.paragraph.rich_text[0].text.content
    );
  });

  it('TC_BLK_GET_002 - [Happy Path] Retrieve pre-created toggle block and verify has_children: true without embedded children array (200 OK)', async () => {
    const res = await blocksAPI.getBlock(ctx.nestedBlockId);
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const toggle = SchemaValidator.assertValid(BlockObjectSchema, res.data) as ToggleBlockResponse;
    expect(toggle.type).toBe('toggle');
    expect(toggle.has_children).toBe(true);
    expect(toggle.toggle.children).toBeUndefined();
  });

  it('TC_BLK_GET_003 - [Happy Path] Retrieve soft-deleted block directly and verify in_trash: true (200 OK)', async () => {
    const createRes = await blocksAPI.appendChildren(ctx.sandboxContainerId, {
      children: [paragraphBlock('Block to trash and retrieve')],
    });
    expect(createRes.status).toBe(200);
    const createdList = SchemaValidator.assertValid(BlockChildrenListSchema, createRes.data);
    const tempId = createdList.results[0].id;

    await throttleBlocksRequest();
    const delRes = await blocksAPI.deleteBlock(tempId);
    expect(delRes.status).toBe(200);

    await throttleBlocksRequest();
    const res = await blocksAPI.getBlock(tempId);
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const trashedBlock = SchemaValidator.assertValid(BlockObjectSchema, res.data);
    expect(trashedBlock.id).toBe(tempId);
    expect(trashedBlock.in_trash).toBe(true);
    expect(trashedBlock.archived).toBe(true);
  });

  it('TC_BLK_GET_009 - [Boundary] Accept compact 32-char hex root block UUID and normalize response to 36-char UUIDv4 (200 OK)', async () => {
    const res = await blocksAPI.getBlock(compactRootBlockId);
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const block = SchemaValidator.assertValid(BlockObjectSchema, res.data);
    expect(block.id).toMatch(UUIDv4Regex);
    expect(block.id).toBe(ctx.parentPageId);
    expect(block.id.replace(/-/g, '').toLowerCase()).toBe(compactRootBlockId.toLowerCase());
  });

  it('TC_BLK_GET_011 - [Boundary] Retrieve root page metadata addressable as a child_page block (200 OK)', async () => {
    const res = await blocksAPI.getBlock(ctx.parentPageId);
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const block = SchemaValidator.assertValid(BlockObjectSchema, res.data);
    expect(block.object).toBe('block');
    expect(block.id).toBe(ctx.parentPageId);
    expect(block.type).toBe('child_page');
    expect(typeof block.has_children).toBe('boolean');
    expect(block.in_trash).toBe(false);
  });

  // ============================================================================
  // Negative Auth & Header Validation Scenarios
  // ============================================================================
  it('TC_BLK_GET_004a - [Negative] Reject request with invalid or forged Bearer token (401 unauthorized)', async () => {
    const res = await blocksAPI.getBlock(ctx.parentPageId, {
      authType: 'bearer',
      bearerToken: 'ntn_forged_invalid_blocks_token_004',
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_BLK_GET_004b - [Negative] Reject request when Authorization header is omitted (401 unauthorized)', async () => {
    const res = await blocksAPI.getBlock(ctx.parentPageId, { authType: 'none' });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_BLK_GET_005a - [Negative] Reject request when Notion-Version header is omitted (400 missing_version)', async () => {
    const res = await blocksAPI.getBlock(ctx.parentPageId, { omitNotionVersion: true });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'missing_version');
  });

  it('TC_BLK_GET_005b - [Negative] Reject request when Notion-Version header is unsupported (2099-01-01 -> 400)', async () => {
    const res = await blocksAPI.getBlock(ctx.parentPageId, { notionVersion: '2099-01-01' });
    ctx.lastResponse = res;

    expect(res.status).toBe(400);
    assertCommonHeadersAndSla(res);
    const errorBody = SchemaValidator.assertValid(NotionErrorSchema, res.data);
    expect(['validation_error', 'missing_version']).toContain(errorBody.code);
  });

  // ============================================================================
  // Data-Driven Invalid & Boundary Block IDs (blocks_dataset.json)
  // ============================================================================
  describe('Data-Driven Invalid & Boundary Block IDs (blocks_dataset.json)', () => {
    for (const testCase of blocksDataset.invalidBlockIds) {
      it(`${testCase.caseId} - [${testCase.category}] ${testCase.description}`, async () => {
        const res = await blocksAPI.getBlock(encodeURIComponent(testCase.blockId));
        ctx.lastResponse = res;

        assertNotionErrorContract(res, testCase.expectedStatus, testCase.expectedCode);
      });
    }
  });
});
