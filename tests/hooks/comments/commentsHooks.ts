// tests/hooks/comments/commentsHooks.ts
import { RequestManager } from '../../../core/api/RequestManager';
import { Logger } from '../../../core/utils/logger';

export class CommentsHooks {
  private client = RequestManager.getInstance().getDefaultClient();
  private createdCommentIds: string[] = [];

  // Precondición: verifica que hay una página padre
  setup(): string {
    const pageId = process.env.NOTION_PAGE_ID || '';
    if (!pageId) {
      throw new Error('NOTION_PAGE_ID is required for Comments tests');
    }
    Logger.info(`CommentsHooks: using page ${pageId}`);
    return pageId;
  }

  trackComment(id: string) {
    this.createdCommentIds.push(id);
  }

  // Postcondición: Notion no permite borrar comentarios; se archiva la página padre si es temporal.
  // En este caso solo limpiamos el registro local.
  async cleanup() {
    Logger.info(`CommentsHooks: ${this.createdCommentIds.length} comments created (no delete endpoint available)`);
    this.createdCommentIds = [];
  }
}