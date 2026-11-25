// main/api/endpoints/commentsAPI.ts
import { RequestManager, TimedAxiosResponse } from '../../../core/api/RequestManager';

export class CommentsAPI {
  private client;

  constructor() {
    this.client = RequestManager.getInstance().getDefaultClient();
  }

  // Cliente especializado para tests negativos (sin Notion-Version)
  private getNoVersionClient() {
    return RequestManager.getInstance().getClient({
      authType: 'bearer',
      bearerToken: process.env.NOTION_TOKEN || '',
      omitNotionVersion: true,
    });
  }

  async createComment(body: any): Promise<TimedAxiosResponse> {
    return (await this.client.post('/comments', body)) as TimedAxiosResponse;
  }

  async createCommentWithoutVersion(body: any): Promise<TimedAxiosResponse> {
    return (await this.getNoVersionClient().post('/comments', body)) as TimedAxiosResponse;
  }

  async listComments(params?: any): Promise<TimedAxiosResponse> {
    return (await this.client.get('/comments', { params })) as TimedAxiosResponse;
  }
}