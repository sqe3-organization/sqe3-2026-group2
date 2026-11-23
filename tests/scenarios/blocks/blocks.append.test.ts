// tests/scenarios/blocks/blocks.append.test.ts
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
  UUIDv4Regex,
} from '../../../main/api/resources/schemas/blocksSchemas';
import {
  cleanupBlocksContext,
  createBlocksTestContext,
  createIsolatedBlockContainer,
  headingBlock,
  paragraphBlock,
  recordBlocksTelemetry,
  richText,
  setupBlocksContext,
  throttleBlocksRequest,
  todoBlock,
  toggleBlock,
} from '../../hooks/blocks/blocksHooks';

interface ParagraphBlockResponse extends BlockObject {
  paragraph: {
    rich_text: Array<{ text: { content: string } }>;
  };
}

const UNASSIGNED_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const HEX_31_CHAR = 'f47ac10b58cc4372a5670e02b2c3d47';

describe('Blocks API — PATCH /v1/blocks/:id/children (Append Block Children)', () => {
  const blocksAPI = new BlocksAPI();
  const ctx = createBlocksTestContext();

  beforeAll(async () => {
    await setupBlocksContext(ctx, blocksAPI, { seedBlocks: true, suiteLabel: 'AppendSuite' });
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
  // Happy Path & Preconditioned Append Scenarios
  // ============================================================================
  it('TC_BLK_APP_001 - [Happy Path] Append a single paragraph block and verify persistence via GET (200 OK)', async () => {
    const content = `Hello from Vitest TC_BLK_APP_001 - ${DataFactory.text(6)}`;
    const res = await blocksAPI.appendChildren(ctx.sandboxContainerId, {
      children: [paragraphBlock(content)],
    });
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const parsed = SchemaValidator.assertValid(BlockChildrenListSchema, res.data);
    expect(parsed.results).toHaveLength(1);

    const created = parsed.results[0] as ParagraphBlockResponse;
    expect(created.object).toBe('block');
    expect(created.type).toBe('paragraph');
    expect(created.id).toMatch(UUIDv4Regex);
    expect(created.paragraph.rich_text[0].text.content).toBe(content);

    // Cross-request data integrity check via GET /blocks/:id
    await throttleBlocksRequest();
    const getRes = await blocksAPI.getBlock(created.id);
    expect(getRes.status).toBe(200);
    const retrieved = SchemaValidator.assertValid(
      BlockObjectSchema,
      getRes.data
    ) as ParagraphBlockResponse;
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.paragraph.rich_text[0].text.content).toBe(content);
  });

  it('TC_BLK_APP_002 - [Happy Path] Append 12 rich block types preserving insertion order (200 OK)', async () => {
    const containerId = await createIsolatedBlockContainer(ctx, blocksAPI, 'TC_BLK_APP_002');
    await throttleBlocksRequest();

    const richBatch: Record<string, unknown>[] = [
      paragraphBlock('Paragraph block'),
      headingBlock(1, 'Heading 1'),
      headingBlock(2, 'Heading 2'),
      headingBlock(3, 'Heading 3'),
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: richText('Bullet 1') },
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: richText('Number 1') },
      },
      todoBlock('To-do task', true),
      toggleBlock('Toggle item'),
      {
        object: 'block',
        type: 'code',
        code: { rich_text: richText('const x = 42;'), language: 'typescript' },
      },
      {
        object: 'block',
        type: 'quote',
        quote: { rich_text: richText('Quoted wisdom') },
      },
      {
        object: 'block',
        type: 'callout',
        callout: { rich_text: richText('Callout notice') },
      },
      {
        object: 'block',
        type: 'divider',
        divider: {},
      },
    ];

    const res = await blocksAPI.appendChildren(containerId, { children: richBatch });
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const parsed = SchemaValidator.assertValid(BlockChildrenListSchema, res.data);
    expect(parsed.results).toHaveLength(12);
    expect(parsed.results.map((block) => block.type)).toEqual([
      'paragraph',
      'heading_1',
      'heading_2',
      'heading_3',
      'bulleted_list_item',
      'numbered_list_item',
      'to_do',
      'toggle',
      'code',
      'quote',
      'callout',
      'divider',
    ]);
  });

  it('TC_BLK_APP_003 - [Happy Path] Insert child block after a specific sibling using after parameter (200 OK)', async () => {
    const containerId = await createIsolatedBlockContainer(ctx, blocksAPI, 'TC_BLK_APP_003');
    await throttleBlocksRequest();

    const setupRes = await blocksAPI.appendChildren(containerId, {
      children: [paragraphBlock('First Sibling'), paragraphBlock('Third Sibling')],
    });
    expect(setupRes.status).toBe(200);
    const setupList = SchemaValidator.assertValid(BlockChildrenListSchema, setupRes.data);
    const firstSiblingId = setupList.results[0].id;

    await throttleBlocksRequest();
    const res = await blocksAPI.appendChildren(containerId, {
      children: [paragraphBlock('Inserted Second Sibling')],
      after: firstSiblingId,
    });
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    await throttleBlocksRequest();
    const listRes = await blocksAPI.getChildren(containerId);
    expect(listRes.status).toBe(200);
    const list = SchemaValidator.assertValid(BlockChildrenListSchema, listRes.data);
    const texts = list.results.map(
      (block) => (block as ParagraphBlockResponse).paragraph.rich_text[0].text.content
    );
    expect(texts).toEqual(['First Sibling', 'Inserted Second Sibling', 'Third Sibling']);
  });

  it('TC_BLK_APP_004 - [Happy Path] Append 2 levels of nested children in a single request (200 OK)', async () => {
    const res = await blocksAPI.appendChildren(ctx.sandboxContainerId, {
      children: [toggleBlock('Outer Toggle', [paragraphBlock('Inner Nested Paragraph')])],
    });
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const parsed = SchemaValidator.assertValid(BlockChildrenListSchema, res.data);
    expect(parsed.results[0].type).toBe('toggle');
    expect(parsed.results[0].has_children).toBe(true);
  });

  // ============================================================================
  // Negative Auth & Header Validation Scenarios
  // ============================================================================
  it('TC_BLK_APP_005a - [Negative] Reject append request with invalid Bearer token (401 unauthorized)', async () => {
    const res = await blocksAPI.appendChildren(
      ctx.parentPageId,
      { children: [] },
      { authType: 'bearer', bearerToken: 'ntn_forged_append_token_005' }
    );
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_BLK_APP_005b - [Negative] Reject append request without Authorization header (401 unauthorized)', async () => {
    const res = await blocksAPI.appendChildren(
      ctx.parentPageId,
      { children: [] },
      { authType: 'none' }
    );
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_BLK_APP_006 - [Negative] Reject append request when Notion-Version header is omitted (400 missing_version)', async () => {
    const res = await blocksAPI.appendChildren(
      ctx.parentPageId,
      { children: [] },
      { omitNotionVersion: true }
    );
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'missing_version');
  });

  // ============================================================================
  // Negative & Boundary Identifier / Payload Scenarios
  // ============================================================================
  it('TC_BLK_APP_008 - [Negative] Return 404 Not Found when appending children to non-existent block_id', async () => {
    const res = await blocksAPI.appendChildren(UNASSIGNED_UUID, {
      children: [paragraphBlock('Ghost child')],
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 404, 'object_not_found');
  });

  it('TC_BLK_APP_009 - [Negative] Reject append request when block_id is not a valid UUID (400 validation_error)', async () => {
    const res = await blocksAPI.appendChildren('not-a-valid-uuid', {
      children: [paragraphBlock('Invalid UUID test')],
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_BLK_APP_016 - [Boundary] Reject append request with off-by-one 31-char hex block_id (400 validation_error)', async () => {
    const res = await blocksAPI.appendChildren(HEX_31_CHAR, {
      children: [paragraphBlock('Off-by-one hex UUID test')],
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_BLK_APP_011 - [Negative] Reject malformed raw JSON body (400 invalid_json)', async () => {
    const res = await blocksAPI.appendChildren(ctx.parentPageId, '{"children": [malformed_json');
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'invalid_json');
  });

  it('TC_BLK_APP_012 - [Negative] Reject appending children to an already archived/trashed block (400 validation_error)', async () => {
    const createRes = await blocksAPI.appendChildren(ctx.sandboxContainerId, {
      children: [toggleBlock('Disposable Toggle To Archive')],
    });
    expect(createRes.status).toBe(200);
    const createdList = SchemaValidator.assertValid(BlockChildrenListSchema, createRes.data);
    const disposableId = createdList.results[0].id;

    await throttleBlocksRequest();
    const delRes = await blocksAPI.deleteBlock(disposableId);
    expect(delRes.status).toBe(200);

    await throttleBlocksRequest();
    const res = await blocksAPI.appendChildren(disposableId, {
      children: [paragraphBlock('Should fail on archived parent')],
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  // ============================================================================
  // Data-Driven GenAI Invalid Append Payloads (blocks_dataset.json)
  // ============================================================================
  describe('Data-Driven Invalid & Boundary Append Payloads (blocks_dataset.json)', () => {
    for (const testCase of blocksDataset.invalidAppendPayloads) {
      it(`${testCase.caseId} - [${testCase.category}] ${testCase.description}`, async () => {
        const res = await blocksAPI.appendChildren(
          ctx.parentPageId,
          testCase.payload as Record<string, unknown>
        );
        ctx.lastResponse = res;

        assertNotionErrorContract(res, testCase.expectedStatus, testCase.expectedCode);
      });
    }
  });

  // ============================================================================
  // Content Length, Batch Size, Nesting Depth & Concurrency Boundaries
  // ============================================================================
  it('TC_BLK_APP_013 - [Boundary] Reject children array exceeding 100-block batch limit (101 blocks -> 400)', async () => {
    const tooManyBlocks = Array.from({ length: 101 }, (_, i) => paragraphBlock(`Item ${i + 1}`));
    expect(tooManyBlocks).toHaveLength(101);

    const res = await blocksAPI.appendChildren(ctx.parentPageId, {
      children: tooManyBlocks,
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_BLK_APP_014a - [Boundary] Accept exact 2000-char rich_text content boundary (200 OK)', async () => {
    const exact2000 = 'x'.repeat(2000);
    expect(exact2000.length).toBe(2000);

    const res = await blocksAPI.appendChildren(ctx.sandboxContainerId, {
      children: [paragraphBlock(exact2000)],
    });
    ctx.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const parsed = SchemaValidator.assertValid(BlockChildrenListSchema, res.data);
    const created = parsed.results[0] as ParagraphBlockResponse;
    expect(created.paragraph.rich_text[0].text.content).toHaveLength(2000);
  });

  it('TC_BLK_APP_014b - [Boundary] Reject paragraph rich_text content exceeding 2000-char limit (2001 chars -> 400)', async () => {
    const oversizedContent = 'a'.repeat(2001);
    expect(oversizedContent.length).toBe(2001);

    const res = await blocksAPI.appendChildren(ctx.parentPageId, {
      children: [paragraphBlock(oversizedContent)],
    });
    ctx.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_BLK_APP_017 - [Boundary] Strictly assert 400 validation_error on 3-level nested block hierarchy', async () => {
    const res = await blocksAPI.appendChildren(ctx.sandboxContainerId, {
      children: [toggleBlock('Level 1', [toggleBlock('Level 2', [paragraphBlock('Level 3')])])],
    });
    ctx.lastResponse = res;

    // Preserves Lab 01/03 contract discrepancy assertion: expects 400 validation_error
    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_BLK_APP_018 - [Boundary] Concurrent burst append asserts [200, 429] rate-limit contract', async () => {
    const burstContainerId = await createIsolatedBlockContainer(
      ctx,
      blocksAPI,
      'TC_BLK_APP_018_Burst'
    );
    await throttleBlocksRequest();

    const burstPromises = Array.from({ length: 6 }, (_, i) =>
      blocksAPI.appendChildren(burstContainerId, {
        children: [paragraphBlock(`Concurrent Burst Item ${i + 1}`)],
      })
    );
    const responses = await Promise.all(burstPromises);
    ctx.lastResponse = responses[0];

    assertCommonHeadersAndSla(responses[0]);
    for (const response of responses) {
      expect([200, 429]).toContain(response.status);
    }
  });
});
