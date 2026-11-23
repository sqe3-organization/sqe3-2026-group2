// tests/scenarios/comments/comments.extra.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CommentsAPI } from '../../../main/api/endpoints/commentsAPI';
import { CommentsHooks } from '../../hooks/comments/commentsHooks';
import { ValentinaTestContextManager } from '../../hooks/common/valentinaTestContext';
import { assertCommonHeadersAndSla, assertNotionErrorContract } from '../../../core/utils/assertions';

describe('Comments Module — Extra Tests (Valentina Molina)', () => {
  const commentsAPI = new CommentsAPI();
  const hooks = new CommentsHooks();
  const ctx = ValentinaTestContextManager.getInstance();

  beforeAll(() => {
    hooks.setup();
  });

  afterAll(async () => {
    await hooks.cleanup();
  });

  it('TC_CMT_LIST_001 - [Happy Path] List comments on a page', async () => {
    // Crear un comentario primero
    const createRes = await commentsAPI.createComment({
      parent: { page_id: ctx.get('pageId') },
      rich_text: [{ text: { content: 'Comment for list test' } }],
    });
    expect(createRes.status).toBe(200);
    hooks.trackComment(createRes.data.id);

    // Listar comentarios
    const listRes = await commentsAPI.listComments({ block_id: ctx.get('pageId') });
    expect(listRes.status).toBe(200);
    assertCommonHeadersAndSla(listRes);
    expect(listRes.data.object).toBe('list');
    expect(Array.isArray(listRes.data.results)).toBe(true);
  });

 it('TC_CMT_CREATE_NEG_002 - [Negative] Reject comment with null rich_text', async () => {
   const res = await commentsAPI.createComment({
     parent: { page_id: ctx.get('pageId') },
     rich_text: null as any,
   });
   assertNotionErrorContract(res, 400, 'validation_error');
 });

  it('TC_CMT_CREATE_NEG_003 - [Negative] Reject comment with invalid page_id', async () => {
    const res = await commentsAPI.createComment({
      parent: { page_id: 'invalid-page-id' },
      rich_text: [{ text: { content: 'Invalid page' } }],
    });
    assertNotionErrorContract(res, 400, 'validation_error');
  });
});