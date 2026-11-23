// main/api/endpoints/searchAPI.ts
import { RequestManager, TimedAxiosResponse } from '../../../core/api/RequestManager';

export interface SearchBody {
  query?: string;
  sort?: {
    direction: 'ascending' | 'descending';
    timestamp: 'last_edited_time';
  };
  filter?: {
    value: 'page' | 'database';
    property: 'object';
  };
  start_cursor?: string;
  page_size?: number;
}

export class SearchAPI {
  private client;

  constructor() {
    this.client = RequestManager.getInstance().getDefaultClient();
  }

  /**
   * POST /v1/search
   * Searches all pages and databases the integration has access to.
   * Supports filtering by object type, sorting and pagination.
   */
  async search(body: SearchBody = {}): Promise<TimedAxiosResponse> {
    return (await this.client.post('/search', body)) as TimedAxiosResponse;
  }
}
