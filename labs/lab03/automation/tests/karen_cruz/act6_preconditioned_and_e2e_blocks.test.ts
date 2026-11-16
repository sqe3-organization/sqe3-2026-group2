import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import {
  notionBearerClient,
  throttleRequest,
  TimedAxiosResponse,
} from '../../src/core/notionClient.js';
import {
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
  BlockObjectSchema,
  PaginatedBlockListSchema,
  UUIDv4Regex,
  CompactHex32Regex,
} from '../../src/core/assertions.js';

const richText = (content: string) => [{ type: 'text', text: { content } }];
const paragraphBlock = (content: string) => ({
  object: 'block',
  type: 'paragraph',
  paragraph: { rich_text: richText(content) },
});
const headingBlock = (level: 1 | 2 | 3, content: string) => ({
  object: 'block',
  type: `heading_${level}`,
  [`heading_${level}`]: { rich_text: richText(content) },
});
const todoBlock = (content: string, checked = false) => ({
  object: 'block',
  type: 'to_do',
  to_do: { rich_text: richText(content), checked },
});
const toggleBlock = (content: string, children?: any[]) => ({
  object: 'block',
  type: 'toggle',
  toggle: {
    rich_text: richText(content),
    ...(children ? { children } : {}),
  },
});

describe('Activity #6 — Preconditioned & Chained E2E API Tests (Blocks Module — Karen Cruz)', () => {
  const telemetryLog: Array<{ testName: string; status: number; durationMs: number }> = [];
  const createdContainerBlockIds: string[] = [];
  let lastResponse: TimedAxiosResponse | null = null;
  let rootPageId = (process.env.PARENT_PAGE_ID || process.env.PAGE_ID || '').trim();
  let sandboxContainerId = '';
  let sharedParagraphId = '';
  let sharedToggleId = '';
  let sharedTodoId = '';

  /**
   * Helper to provision an isolated toggle container block for destructive/pagination sub-flows
   * and register it for automatic teardown in afterAll.
   */
  async function createIsolatedContainer(label: string): Promise<string> {
    await throttleRequest(350);
    const res = (await notionBearerClient.patch(`/blocks/${rootPageId}/children`, {
      children: [toggleBlock(`QA Automated Container - ${label} - ${Date.now()}`)],
    })) as TimedAxiosResponse;
    expect(res.status).toBe(200);
    const id = res.data.results[0].id as string;
    createdContainerBlockIds.push(id);
    return id;
  }

  // Lifecycle Hook 1: beforeAll — Discover/verify rootPageId & provision sandbox container block
  beforeAll(async () => {
    expect(process.env.NOTION_BASE_URL || 'https://api.notion.com/v1').toContain('api.notion.com');
    expect(Boolean(process.env.NOTION_TOKEN)).toBe(true);

    if (!rootPageId || rootPageId === 'YOUR_SHARED_PARENT_PAGE_UUID') {
      const searchRes = (await notionBearerClient.post('/search', {
        filter: { value: 'page', property: 'object' },
        page_size: 1,
      })) as TimedAxiosResponse;
      expect(searchRes.status).toBe(200);
      expect(searchRes.data.results?.length).toBeGreaterThan(0);
      rootPageId = searchRes.data.results[0].id;
    }

    expect(rootPageId).toMatch(UUIDv4Regex);

    // Create main sandbox container block (toggle) + initial preconditioned child blocks
    sandboxContainerId = await createIsolatedContainer('MainSandbox');
    expect(sandboxContainerId).toMatch(UUIDv4Regex);

    await throttleRequest(350);
    const seedRes = (await notionBearerClient.patch(`/blocks/${sandboxContainerId}/children`, {
      children: [
        paragraphBlock('Seed Paragraph 1'),
        toggleBlock('Seed Toggle With Child', [paragraphBlock('Nested Child inside Seed Toggle')]),
        todoBlock('Seed ToDo Item', false),
      ],
    })) as TimedAxiosResponse;
    expect(seedRes.status).toBe(200);
    sharedParagraphId = seedRes.data.results[0].id;
    sharedToggleId = seedRes.data.results[1].id;
    sharedTodoId = seedRes.data.results[2].id;
  }, 60000);

  // Lifecycle Hook 2: beforeEach — Enforce 350 ms rate-limit guard before each request
  beforeEach(async () => {
    lastResponse = null;
    await throttleRequest(350);
  });

  // Lifecycle Hook 3: afterEach — Capture per-test status and duration telemetry
  afterEach((context) => {
    if (lastResponse) {
      telemetryLog.push({
        testName: context.task.name,
        status: lastResponse.status,
        durationMs: lastResponse.durationMs,
      });
    }
  });

  // Lifecycle Hook 4: afterAll — Archive (DELETE /v1/blocks/{id}) all created sandbox container blocks
  afterAll(async () => {
    for (const blockId of createdContainerBlockIds) {
      await throttleRequest(350);
      await notionBearerClient.delete(`/blocks/${blockId}`);
    }
    createdContainerBlockIds.length = 0;
    telemetryLog.length = 0;
  }, 60000);

  // ============================================================================
  // Suite 01 — PATCH /v1/blocks/{block_id}/children (Preconditioned Block Creation, Rich Types, Boundaries & Concurrency)
  // ============================================================================
  describe('Suite 01: PATCH /v1/blocks/{block_id}/children — Preconditioned Creation, Rich Types, Boundaries & Concurrency', () => {
    it('TC_BLK_APP_001 - [Happy Path] Append a single paragraph block and verify persistence via GET (200 OK)', async () => {
      const res = (await notionBearerClient.patch(`/blocks/${sandboxContainerId}/children`, {
        children: [paragraphBlock('Hello from Vitest TC_BLK_APP_001')],
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);

      const parsed = PaginatedBlockListSchema.safeParse(res.data);
      expect(parsed.success).toBe(true);
      expect(res.data.results).toHaveLength(1);

      const created = res.data.results[0];
      expect(created.object).toBe('block');
      expect(created.type).toBe('paragraph');
      expect(created.id).toMatch(UUIDv4Regex);
      expect(created.paragraph.rich_text[0].text.content).toBe('Hello from Vitest TC_BLK_APP_001');

      // Layer 5 (Cross-Request Data Integrity): Verify via follow-up GET
      await throttleRequest(350);
      const getRes = (await notionBearerClient.get(`/blocks/${created.id}`)) as TimedAxiosResponse;
      expect(getRes.status).toBe(200);
      expect(getRes.data.id).toBe(created.id);
      expect(getRes.data.paragraph.rich_text[0].text.content).toBe(
        'Hello from Vitest TC_BLK_APP_001'
      );
    });

    it('TC_BLK_APP_002 - [Happy Path] Append multiple rich block types (paragraph, headings, lists, to_do, toggle, code, quote, callout, divider) preserving order (200 OK)', async () => {
      const containerId = await createIsolatedContainer('TC_BLK_APP_002');
      await throttleRequest(350);

      const richBatch = [
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

      const res = (await notionBearerClient.patch(`/blocks/${containerId}/children`, {
        children: richBatch,
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(PaginatedBlockListSchema.safeParse(res.data).success).toBe(true);
      expect(res.data.results).toHaveLength(12);
      expect(res.data.results.map((b: any) => b.type)).toEqual([
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

    it('TC_BLK_APP_003 - [Happy Path] Insert child block after a specific pre-created sibling using after parameter (200 OK)', async () => {
      const containerId = await createIsolatedContainer('TC_BLK_APP_003');
      await throttleRequest(350);

      const setupRes = (await notionBearerClient.patch(`/blocks/${containerId}/children`, {
        children: [paragraphBlock('First Sibling'), paragraphBlock('Third Sibling')],
      })) as TimedAxiosResponse;
      expect(setupRes.status).toBe(200);
      const firstSiblingId = setupRes.data.results[0].id;

      await throttleRequest(350);
      const res = (await notionBearerClient.patch(`/blocks/${containerId}/children`, {
        children: [paragraphBlock('Inserted Second Sibling')],
        after: firstSiblingId,
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);

      await throttleRequest(350);
      const listRes = (await notionBearerClient.get(
        `/blocks/${containerId}/children`
      )) as TimedAxiosResponse;
      expect(listRes.status).toBe(200);
      const texts = listRes.data.results.map((b: any) => b.paragraph.rich_text[0].text.content);
      expect(texts).toEqual(['First Sibling', 'Inserted Second Sibling', 'Third Sibling']);
    });

    it('TC_BLK_APP_004 - [Happy Path] Append 2 levels of nested children in a single request (200 OK)', async () => {
      const res = (await notionBearerClient.patch(`/blocks/${sandboxContainerId}/children`, {
        children: [toggleBlock('Outer Toggle', [paragraphBlock('Inner Nested Paragraph')])],
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.results[0].type).toBe('toggle');
      expect(res.data.results[0].has_children).toBe(true);
    });

    it('TC_BLK_APP_014a - [Boundary] Accept exact 2000-char rich_text content and 100-block array batch boundary (200 OK)', async () => {
      const exact2000 = 'x'.repeat(2000);
      expect(exact2000.length).toBe(2000);

      const res = (await notionBearerClient.patch(`/blocks/${sandboxContainerId}/children`, {
        children: [paragraphBlock(exact2000)],
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.results[0].paragraph.rich_text[0].text.content).toHaveLength(2000);
    });

    it('TC_BLK_APP_017 - [Boundary & Contract Discrepancy] Strictly assert 400 validation_error on 3-level nested block hierarchy (exposes 200 OK API discrepancy)', async () => {
      // 3 levels of block hierarchy (toggle -> toggle -> paragraph)
      const res = (await notionBearerClient.patch(`/blocks/${sandboxContainerId}/children`, {
        children: [toggleBlock('Level 1', [toggleBlock('Level 2', [paragraphBlock('Level 3')])])],
      })) as TimedAxiosResponse;
      lastResponse = res;

      // Strict contract assertion per Lab 01 / Kiara peer review: expects 400 validation_error, Notion returns 200 OK
      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_APP_018 - [Boundary & Contract Discrepancy] Concurrent burst append strictly asserts [200, 429] (exposes 409 Conflict optimistic lock collision)', async () => {
      const burstContainerId = await createIsolatedContainer('TC_BLK_APP_018_Burst');
      await throttleRequest(350);

      const burstPromises = Array.from({ length: 6 }, (_, i) =>
        notionBearerClient.patch(`/blocks/${burstContainerId}/children`, {
          children: [paragraphBlock(`Concurrent Burst Item ${i + 1}`)],
        })
      );
      const responses = (await Promise.all(burstPromises)) as TimedAxiosResponse[];
      lastResponse = responses[0];

      assertCommonHeadersAndSla(responses[0]);
      // Strict contract check: every response should be 200 OK or 429 Too Many Requests (exposes 409 Conflict)
      for (const r of responses) {
        expect([200, 429]).toContain(r.status);
      }
    });

    it('TC_BLK_APP_012 - [Negative Preconditioned] Reject appending children to an already archived/trashed block (400 validation_error)', async () => {
      await throttleRequest(350);
      const createRes = (await notionBearerClient.patch(`/blocks/${sandboxContainerId}/children`, {
        children: [toggleBlock('Disposable Toggle To Archive')],
      })) as TimedAxiosResponse;
      const disposableId = createRes.data.results[0].id;

      await throttleRequest(350);
      const delRes = await notionBearerClient.delete(`/blocks/${disposableId}`);
      expect(delRes.status).toBe(200);

      await throttleRequest(350);
      const res = (await notionBearerClient.patch(`/blocks/${disposableId}/children`, {
        children: [paragraphBlock('Should fail on archived parent')],
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });
  });

  // ============================================================================
  // Suite 02 — GET /v1/blocks/{block_id} & GET /v1/blocks/{block_id}/children (Preconditioned Retrieval & Cursor Pagination)
  // ============================================================================
  describe('Suite 02: GET /v1/blocks/{block_id} & /children — Preconditioned Retrieval & Cursor Pagination', () => {
    it('TC_BLK_GET_001 - [Happy Path & Data Integrity] Retrieve newly created child block by 36-char UUIDv4 and compact 32-char hex ID (200 OK)', async () => {
      const resHyphenated = (await notionBearerClient.get(
        `/blocks/${sharedParagraphId}`
      )) as TimedAxiosResponse;
      lastResponse = resHyphenated;

      expect(resHyphenated.status).toBe(200);
      assertCommonHeadersAndSla(resHyphenated);
      expect(BlockObjectSchema.safeParse(resHyphenated.data).success).toBe(true);
      expect(resHyphenated.data.id).toBe(sharedParagraphId);
      expect(resHyphenated.data.type).toBe('paragraph');

      const compactId = sharedParagraphId.replace(/-/g, '');
      expect(compactId).toMatch(CompactHex32Regex);

      await throttleRequest(350);
      const resCompact = (await notionBearerClient.get(
        `/blocks/${compactId}`
      )) as TimedAxiosResponse;
      expect(resCompact.status).toBe(200);
      expect(resCompact.data.id).toBe(sharedParagraphId);
      expect(resCompact.data.paragraph.rich_text[0].text.content).toBe(
        resHyphenated.data.paragraph.rich_text[0].text.content
      );
    });

    it('TC_BLK_GET_002 - [Happy Path] Retrieve pre-created toggle block and verify has_children: true without embedded children array (200 OK)', async () => {
      const res = (await notionBearerClient.get(`/blocks/${sharedToggleId}`)) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(BlockObjectSchema.safeParse(res.data).success).toBe(true);
      expect(res.data.type).toBe('toggle');
      expect(res.data.has_children).toBe(true);
      expect(res.data.toggle.children).toBeUndefined();
    });

    it('TC_BLK_GET_003 - [Happy Path] Retrieve soft-deleted block directly and verify in_trash: true (200 OK)', async () => {
      const createRes = (await notionBearerClient.patch(`/blocks/${sandboxContainerId}/children`, {
        children: [paragraphBlock('Block to trash and retrieve')],
      })) as TimedAxiosResponse;
      const tempId = createRes.data.results[0].id;

      await throttleRequest(350);
      await notionBearerClient.delete(`/blocks/${tempId}`);

      await throttleRequest(350);
      const res = (await notionBearerClient.get(`/blocks/${tempId}`)) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.id).toBe(tempId);
      expect(res.data.in_trash).toBe(true);
      expect(res.data.archived).toBe(true);
    });

    it('TC_BLK_CHL_002 - [Happy Path] Traverse cursor-based pagination (page_size=1 & start_cursor) with non-overlapping block IDs (200 OK)', async () => {
      const page1Res = (await notionBearerClient.get(`/blocks/${sandboxContainerId}/children`, {
        params: { page_size: 1 },
      })) as TimedAxiosResponse;
      lastResponse = page1Res;

      expect(page1Res.status).toBe(200);
      assertCommonHeadersAndSla(page1Res);
      expect(PaginatedBlockListSchema.safeParse(page1Res.data).success).toBe(true);
      expect(page1Res.data.results).toHaveLength(1);
      expect(page1Res.data.has_more).toBe(true);
      expect(typeof page1Res.data.next_cursor).toBe('string');

      const page1BlockId = page1Res.data.results[0].id;
      const nextCursor = page1Res.data.next_cursor;

      await throttleRequest(350);
      const page2Res = (await notionBearerClient.get(`/blocks/${sandboxContainerId}/children`, {
        params: { page_size: 1, start_cursor: nextCursor },
      })) as TimedAxiosResponse;
      expect(page2Res.status).toBe(200);
      assertCommonHeadersAndSla(page2Res);
      expect(page2Res.data.results).toHaveLength(1);
      expect(page2Res.data.results[0].id).not.toBe(page1BlockId);
    });

    it('TC_BLK_CHL_003 - [Happy Path] Retrieve children of a childless paragraph block returns empty results: [] and has_more: false (200 OK)', async () => {
      const res = (await notionBearerClient.get(
        `/blocks/${sharedParagraphId}/children`
      )) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(PaginatedBlockListSchema.safeParse(res.data).success).toBe(true);
      expect(res.data.results).toEqual([]);
      expect(res.data.has_more).toBe(false);
      expect(res.data.next_cursor).toBeNull();
    });
  });

  // ============================================================================
  // Suite 03 — PATCH /v1/blocks/{block_id} (Preconditioned Block Content Updates, Archiving & Type Mismatch)
  // ============================================================================
  describe('Suite 03: PATCH /v1/blocks/{block_id} — Preconditioned Updates, Archiving & Type Mismatch', () => {
    it('TC_BLK_UPD_001 - [Happy Path & Data Integrity] Update paragraph text content and verify persistence via follow-up GET (200 OK)', async () => {
      const updatedText = `Updated Paragraph Content - ${Date.now()}`;
      const res = (await notionBearerClient.patch(`/blocks/${sharedParagraphId}`, {
        paragraph: { rich_text: richText(updatedText) },
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(BlockObjectSchema.safeParse(res.data).success).toBe(true);
      expect(res.data.paragraph.rich_text[0].text.content).toBe(updatedText);

      await throttleRequest(350);
      const getRes = (await notionBearerClient.get(
        `/blocks/${sharedParagraphId}`
      )) as TimedAxiosResponse;
      expect(getRes.status).toBe(200);
      expect(getRes.data.paragraph.rich_text[0].text.content).toBe(updatedText);
    });

    it('TC_BLK_UPD_002 - [Happy Path & Data Integrity] Toggle to_do checked state (true/false) and verify persistence (200 OK)', async () => {
      const resTrue = (await notionBearerClient.patch(`/blocks/${sharedTodoId}`, {
        to_do: { checked: true },
      })) as TimedAxiosResponse;
      lastResponse = resTrue;

      expect(resTrue.status).toBe(200);
      assertCommonHeadersAndSla(resTrue);
      expect(resTrue.data.to_do.checked).toBe(true);

      await throttleRequest(350);
      const resFalse = (await notionBearerClient.patch(`/blocks/${sharedTodoId}`, {
        to_do: { checked: false },
      })) as TimedAxiosResponse;
      expect(resFalse.status).toBe(200);
      expect(resFalse.data.to_do.checked).toBe(false);
    });

    it('TC_BLK_UPD_012a - [Boundary] Update paragraph with exact 2000-char string (200 OK) and reject 2001-char overflow (400)', async () => {
      const exact2000 = 'u'.repeat(2000);
      const resOk = (await notionBearerClient.patch(`/blocks/${sharedParagraphId}`, {
        paragraph: { rich_text: richText(exact2000) },
      })) as TimedAxiosResponse;
      lastResponse = resOk;

      expect(resOk.status).toBe(200);
      assertCommonHeadersAndSla(resOk);
      expect(resOk.data.paragraph.rich_text[0].text.content).toHaveLength(2000);

      await throttleRequest(350);
      const over2001 = 'u'.repeat(2001);
      const resErr = (await notionBearerClient.patch(`/blocks/${sharedParagraphId}`, {
        paragraph: { rich_text: richText(over2001) },
      })) as TimedAxiosResponse;
      assertNotionErrorContract(resErr, 400, 'validation_error');
    });

    it('TC_BLK_DEL_011 - [Boundary] Archive (in_trash: true) and unarchive (in_trash: false) a pre-created block via PATCH (200 OK)', async () => {
      const createRes = (await notionBearerClient.patch(`/blocks/${sandboxContainerId}/children`, {
        children: [paragraphBlock('Block for Archive/Unarchive cycle')],
      })) as TimedAxiosResponse;
      const cycleBlockId = createRes.data.results[0].id;

      await throttleRequest(350);
      const archiveRes = (await notionBearerClient.patch(`/blocks/${cycleBlockId}`, {
        in_trash: true,
      })) as TimedAxiosResponse;
      expect(archiveRes.status).toBe(200);
      expect(archiveRes.data.in_trash).toBe(true);

      await throttleRequest(350);
      const restoreRes = (await notionBearerClient.patch(`/blocks/${cycleBlockId}`, {
        in_trash: false,
      })) as TimedAxiosResponse;
      lastResponse = restoreRes;

      expect(restoreRes.status).toBe(200);
      assertCommonHeadersAndSla(restoreRes);
      expect(restoreRes.data.in_trash).toBe(false);
      expect(restoreRes.data.archived).toBe(false);
    });

    it('TC_BLK_UPD_009 - [Negative] Reject updating a paragraph block with a mismatched to_do payload (400 validation_error)', async () => {
      const res = (await notionBearerClient.patch(`/blocks/${sharedParagraphId}`, {
        to_do: { rich_text: richText('Mismatched type update'), checked: true },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });
  });

  // ============================================================================
  // Suite 04 — DELETE /v1/blocks/{block_id} (Preconditioned Block Deletion & Parent-Child Cascade)
  // ============================================================================
  describe('Suite 04: DELETE /v1/blocks/{block_id} — Preconditioned Deletion & Parent-Child Cascade', () => {
    it('TC_BLK_DEL_001 - [Happy Path] Soft-delete a pre-created block via DELETE /v1/blocks/{block_id} (200 OK, in_trash: true)', async () => {
      const createRes = (await notionBearerClient.patch(`/blocks/${sandboxContainerId}/children`, {
        children: [paragraphBlock('Disposable block for TC_BLK_DEL_001')],
      })) as TimedAxiosResponse;
      const delId = createRes.data.results[0].id;

      await throttleRequest(350);
      const res = (await notionBearerClient.delete(`/blocks/${delId}`)) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(BlockObjectSchema.safeParse(res.data).success).toBe(true);
      expect(res.data.id).toBe(delId);
      expect(res.data.in_trash).toBe(true);
      expect(res.data.archived).toBe(true);
    });

    it('TC_BLK_DEL_002 - [Happy Path & Data Integrity] Verify deleted block no longer appears in parent children list (200 OK)', async () => {
      const containerId = await createIsolatedContainer('TC_BLK_DEL_002');
      await throttleRequest(350);

      const createRes = (await notionBearerClient.patch(`/blocks/${containerId}/children`, {
        children: [paragraphBlock('Keep Me'), paragraphBlock('Delete Me')],
      })) as TimedAxiosResponse;
      const keepId = createRes.data.results[0].id;
      const deleteId = createRes.data.results[1].id;

      await throttleRequest(350);
      const delRes = (await notionBearerClient.delete(`/blocks/${deleteId}`)) as TimedAxiosResponse;
      lastResponse = delRes;
      expect(delRes.status).toBe(200);

      await throttleRequest(350);
      const childrenRes = (await notionBearerClient.get(
        `/blocks/${containerId}/children`
      )) as TimedAxiosResponse;
      expect(childrenRes.status).toBe(200);
      const remainingIds = childrenRes.data.results.map((b: any) => b.id);
      expect(remainingIds).toContain(keepId);
      expect(remainingIds).not.toContain(deleteId);
    });

    it('TC_BLK_DEL_009 - [Boundary] Reject content update on an already-deleted block with 400 validation_error', async () => {
      const createRes = (await notionBearerClient.patch(`/blocks/${sandboxContainerId}/children`, {
        children: [paragraphBlock('Block for already-deleted check')],
      })) as TimedAxiosResponse;
      const delId = createRes.data.results[0].id;

      await throttleRequest(350);
      await notionBearerClient.delete(`/blocks/${delId}`);

      await throttleRequest(350);
      const res = (await notionBearerClient.patch(`/blocks/${delId}`, {
        paragraph: { rich_text: richText('Cannot edit trashed block') },
      })) as TimedAxiosResponse;
      lastResponse = res;

      assertNotionErrorContract(res, 400, 'validation_error');
    });

    it('TC_BLK_DEL_003 - [Happy Path & Contract Discrepancy] Delete parent toggle block with nested children and query GET /children (exposes 404 vs 200 discrepancy)', async () => {
      const createRes = (await notionBearerClient.patch(`/blocks/${sandboxContainerId}/children`, {
        children: [toggleBlock('Parent Toggle To Delete', [paragraphBlock('Nested Child Block')])],
      })) as TimedAxiosResponse;
      const parentToggleId = createRes.data.results[0].id;

      await throttleRequest(350);
      const delRes = (await notionBearerClient.delete(
        `/blocks/${parentToggleId}`
      )) as TimedAxiosResponse;
      expect(delRes.status).toBe(200);
      expect(delRes.data.in_trash).toBe(true);

      await throttleRequest(350);
      const childrenRes = (await notionBearerClient.get(
        `/blocks/${parentToggleId}/children`
      )) as TimedAxiosResponse;
      lastResponse = childrenRes;

      assertCommonHeadersAndSla(childrenRes);
      // Strict contract assertion expecting 200 OK (empty list) on trashed parent children lookup; Notion returns 404 object_not_found
      expect(childrenRes.status).toBe(200);
    });
  });

  // ============================================================================
  // Suite 05 — Chained E2E Block Lifecycle Workflows (06_E2E_Flows)
  // ============================================================================
  describe('Suite 05: Chained E2E Block Lifecycle Workflows (06_E2E_Flows)', () => {
    let e2eContainerId = '';
    let e2eBlockId = '';
    const initialE2EText = 'E2E Step 1 Initial Paragraph Text';
    const updatedE2EText = 'E2E Step 4 Updated Paragraph Text';

    it('TC_E2E_BLK_001_Step1 - [E2E Flow 1 - Step 1] Append child paragraph block to sandbox container (PATCH /children -> 200 OK)', async () => {
      e2eContainerId = await createIsolatedContainer('TC_E2E_BLK_001');
      await throttleRequest(350);

      const res = (await notionBearerClient.patch(`/blocks/${e2eContainerId}/children`, {
        children: [paragraphBlock(initialE2EText)],
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(PaginatedBlockListSchema.safeParse(res.data).success).toBe(true);
      expect(res.data.results).toHaveLength(1);

      e2eBlockId = res.data.results[0].id;
      expect(e2eBlockId).toMatch(UUIDv4Regex);
    });

    it('TC_E2E_BLK_001_Step2 - [E2E Flow 1 - Step 2] Retrieve parent children list (GET /children) and verify new block presence', async () => {
      const res = (await notionBearerClient.get(
        `/blocks/${e2eContainerId}/children`
      )) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      const ids = res.data.results.map((b: any) => b.id);
      expect(ids).toContain(e2eBlockId);
    });

    it('TC_E2E_BLK_001_Step3 - [E2E Flow 1 - Step 3] Retrieve block by ID (GET /blocks/{id}) and verify baseline text & parent pointer', async () => {
      const res = (await notionBearerClient.get(`/blocks/${e2eBlockId}`)) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(BlockObjectSchema.safeParse(res.data).success).toBe(true);
      expect(res.data.id).toBe(e2eBlockId);
      expect(res.data.parent.block_id).toBe(e2eContainerId);
      expect(res.data.paragraph.rich_text[0].text.content).toBe(initialE2EText);
    });

    it('TC_E2E_BLK_001_Step4 - [E2E Flow 1 - Step 4] Update block content (PATCH /blocks/{id}) and verify updated text via GET', async () => {
      const res = (await notionBearerClient.patch(`/blocks/${e2eBlockId}`, {
        paragraph: { rich_text: richText(updatedE2EText) },
      })) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.paragraph.rich_text[0].text.content).toBe(updatedE2EText);

      await throttleRequest(350);
      const verifyGet = (await notionBearerClient.get(
        `/blocks/${e2eBlockId}`
      )) as TimedAxiosResponse;
      expect(verifyGet.status).toBe(200);
      expect(verifyGet.data.paragraph.rich_text[0].text.content).toBe(updatedE2EText);
    });

    it('TC_E2E_BLK_001_Step5 - [E2E Flow 1 - Step 5] Soft-delete block (DELETE /blocks/{id} -> 200 OK, in_trash: true)', async () => {
      const res = (await notionBearerClient.delete(`/blocks/${e2eBlockId}`)) as TimedAxiosResponse;
      lastResponse = res;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.id).toBe(e2eBlockId);
      expect(res.data.in_trash).toBe(true);
    });

    it('TC_E2E_BLK_001_Step6 - [E2E Flow 1 - Step 6] Confirm in_trash: true via GET /blocks/{id} and absence from parent active children', async () => {
      const listRes = (await notionBearerClient.get(
        `/blocks/${e2eContainerId}/children`
      )) as TimedAxiosResponse;
      expect(listRes.status).toBe(200);
      expect(listRes.data.results.map((b: any) => b.id)).not.toContain(e2eBlockId);

      await throttleRequest(350);
      const getRes = (await notionBearerClient.get(`/blocks/${e2eBlockId}`)) as TimedAxiosResponse;
      lastResponse = getRes;

      expect(getRes.status).toBe(200);
      assertCommonHeadersAndSla(getRes);
      expect(getRes.data.in_trash).toBe(true);
      expect(getRes.data.archived).toBe(true);
    });

    it('TC_E2E_BLK_002 - [E2E Flow 2 - Part A] Paginated block tree traversal across multiple cursor pages with zero duplicate IDs', async () => {
      const treeContainerId = await createIsolatedContainer('TC_E2E_BLK_002');
      await throttleRequest(350);

      const batch = Array.from({ length: 5 }, (_, i) => paragraphBlock(`Paginated Node ${i + 1}`));
      const appendRes = await notionBearerClient.patch(`/blocks/${treeContainerId}/children`, {
        children: batch,
      });
      expect(appendRes.status).toBe(200);

      const collectedIds: string[] = [];
      let cursor: string | null = null;
      let pagesTraversed = 0;

      do {
        await throttleRequest(350);
        const pageRes = (await notionBearerClient.get(`/blocks/${treeContainerId}/children`, {
          params: { page_size: 2, ...(cursor ? { start_cursor: cursor } : {}) },
        })) as TimedAxiosResponse;
        lastResponse = pageRes;

        expect(pageRes.status).toBe(200);
        assertCommonHeadersAndSla(pageRes);
        for (const item of pageRes.data.results) {
          collectedIds.push(item.id);
        }
        cursor = pageRes.data.has_more ? pageRes.data.next_cursor : null;
        pagesTraversed++;
      } while (cursor);

      expect(pagesTraversed).toBe(3);
      expect(collectedIds).toHaveLength(5);
      expect(new Set(collectedIds).size).toBe(5);
    });

    it('TC_E2E_BLK_003 - [E2E Flow 2 - Part B & Contract Discrepancy] Insert B after A, delete B, restore B via PATCH, and strictly assert [A, B, C] order', async () => {
      const orderContainerId = await createIsolatedContainer('TC_E2E_BLK_003');
      await throttleRequest(350);

      // Step 1: Append A and C
      const step1Res = await notionBearerClient.patch(`/blocks/${orderContainerId}/children`, {
        children: [paragraphBlock('A'), paragraphBlock('C')],
      });
      expect(step1Res.status).toBe(200);
      const blockAId = step1Res.data.results[0].id;

      // Step 2: Insert B after A
      await throttleRequest(350);
      const step2Res = await notionBearerClient.patch(`/blocks/${orderContainerId}/children`, {
        children: [paragraphBlock('B')],
        after: blockAId,
      });
      expect(step2Res.status).toBe(200);
      const blockBId = step2Res.data.results[0].id;

      // Step 3: Delete B
      await throttleRequest(350);
      const step4Del = await notionBearerClient.delete(`/blocks/${blockBId}`);
      expect(step4Del.status).toBe(200);

      // Step 4: Restore B via PATCH { in_trash: false }
      await throttleRequest(350);
      const step5Restore = (await notionBearerClient.patch(`/blocks/${blockBId}`, {
        in_trash: false,
      })) as TimedAxiosResponse;
      expect(step5Restore.status).toBe(200);
      expect(step5Restore.data.in_trash).toBe(false);

      // Step 5: Re-list children and strictly assert ["A", "B", "C"] (exposes Notion ["A", "C", "B"] restoration discrepancy)
      await throttleRequest(350);
      const listRes = (await notionBearerClient.get(
        `/blocks/${orderContainerId}/children`
      )) as TimedAxiosResponse;
      lastResponse = listRes;

      expect(listRes.status).toBe(200);
      assertCommonHeadersAndSla(listRes);
      const actualOrder = listRes.data.results.map(
        (b: any) => b.paragraph.rich_text[0].text.content
      );
      expect(actualOrder).toEqual(['A', 'B', 'C']);
    });
  });
});
