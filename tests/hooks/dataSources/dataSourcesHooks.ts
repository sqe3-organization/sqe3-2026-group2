// tests/hooks/dataSources/dataSourcesHooks.ts
import { RequestManager } from '../../../core/api/RequestManager';
import { Logger } from '../../../core/utils/logger';
import { ValentinaTestContextManager } from '../common/valentinaTestContext';

export class DataSourcesHooks {
  private client = RequestManager.getInstance().getDefaultClient();
  private ctx = ValentinaTestContextManager.getInstance();
  private tempDatabaseId: string | null = null;

  async setup(): Promise<string> {
    // SIEMPRE crear una DB temporal nueva (ignorar .env para evitar la DB llena)
    const pageId = this.ctx.get('pageId') || process.env.NOTION_PAGE_ID || '';
    if (!pageId) {
      throw new Error('NOTION_PAGE_ID is required to create a temporary database');
    }

    Logger.info('DataSourcesHooks: creating a FRESH temporary database');
    const res = await this.client.post('/databases', {
      parent: { type: 'page_id', page_id: pageId },
      title: [{ type: 'text', text: { content: `Temp DB for DS Tests - ${Date.now()}` } }],
      properties: { Name: { title: {} } },
    });

    if (res.status !== 200) {
      throw new Error(`Failed to create temp database: ${JSON.stringify(res.data)}`);
    }

    this.tempDatabaseId = res.data.id;
    if (!this.tempDatabaseId) {
      throw new Error('Failed to extract database ID from response');
    }

    this.ctx.set('databaseId', this.tempDatabaseId);
    Logger.info(`DataSourcesHooks: temp database created ${this.tempDatabaseId}`);
    return this.tempDatabaseId;
  }

  trackDataSource(id: string) {
    this.ctx.addCreatedId(id);
  }

  async cleanup() {
    if (this.tempDatabaseId) {
      Logger.info(`DataSourcesHooks: archiving temp database ${this.tempDatabaseId}`);
      await this.client.patch(`/databases/${this.tempDatabaseId}`, { in_trash: true });
      this.tempDatabaseId = null;
    }
    this.ctx.reset();
  }
}