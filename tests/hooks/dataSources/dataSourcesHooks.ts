// tests/hooks/dataSources/dataSourcesHooks.ts
import { RequestManager } from '../../../core/api/RequestManager';
import { Logger } from '../../../core/utils/logger';

export class DataSourcesHooks {
  private client = RequestManager.getInstance().getDefaultClient();
  private tempDatabaseId: string | null = null;
  private createdDataSourceIds: string[] = [];

  async setup(): Promise<string> {
    const envDbId = process.env.NOTION_DATABASE_ID;
    if (envDbId) {
      Logger.info('DataSourcesHooks: using NOTION_DATABASE_ID from .env');
      return envDbId;
    }

    const pageId = process.env.NOTION_PAGE_ID || '';
    if (!pageId) {
      throw new Error('NOTION_PAGE_ID is required to create a temporary database');
    }

    Logger.info('DataSourcesHooks: creating temporary database');
    const res = await this.client.post('/databases', {
      parent: { type: 'page_id', page_id: pageId },
      title: [{ type: 'text', text: { content: 'Temp DB for Data Sources Tests' } }],
      properties: { Name: { title: {} } },
    });

    if (res.status !== 200) {
      throw new Error(`Failed to create temp database: ${JSON.stringify(res.data)}`);
    }

    this.tempDatabaseId = res.data.id;
    
    // Verificación explícita para TypeScript
    if (!this.tempDatabaseId) {
      throw new Error('Failed to extract database ID from response');
    }
    
    Logger.info(`DataSourcesHooks: temp database created ${this.tempDatabaseId}`);
    return this.tempDatabaseId;
  }

  trackDataSource(id: string) {
    this.createdDataSourceIds.push(id);
  }

  async cleanup() {
    if (this.tempDatabaseId) {
      Logger.info(`DataSourcesHooks: archiving temp database ${this.tempDatabaseId}`);
      await this.client.patch(`/databases/${this.tempDatabaseId}`, { in_trash: true });
      this.tempDatabaseId = null;
    }
    this.createdDataSourceIds = [];
  }
}