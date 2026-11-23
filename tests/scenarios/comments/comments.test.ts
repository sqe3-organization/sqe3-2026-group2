// tests/scenarios/comments/comments.test.ts
import { describe, it, expect } from 'vitest';
import { CommentsAPI } from '../../../main/api/endpoints/commentsAPI';
import { assertNotionErrorContract } from '../../../core/utils/assertions';

describe('Comments Module — Valentina Molina', () => {
  const commentsAPI = new CommentsAPI();
  const pageId = process.env.NOTION_PAGE_ID || '';

  it('TC_CMT_CREATE_NEG - [Negative Contract] Reject comment creation without Notion-Version header', async () => {
    const res = await commentsAPI.createCommentWithoutVersion({
      parent: { page_id: pageId },
      rich_text: [{ text: { content: 'Comentario sin version' } }],
    });

    assertNotionErrorContract(res, 400, 'missing_version');
  });

  it('TC_CMT_CREATE_001 - [Happy Path] Create a comment on a page successfully', async () => {
    const res = await commentsAPI.createComment({
      parent: { page_id: pageId },
      rich_text: [{ text: { content: 'Comentario de prueba automatizado' } }],
    });

    expect(res.status).toBe(200);
    expect(res.data.object).toBe('comment');
  });
});