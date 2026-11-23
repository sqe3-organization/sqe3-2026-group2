// main/api/endpoints/databasesAPI.ts
import { RequestManager, TimedAxiosResponse } from '../../../core/api/RequestManager';

export class DatabasesAPI {
  private client;

  constructor() {
    this.client = RequestManager.getInstance().getDefaultClient();
  }

  /**
   * POST /v1/databases
   * Creates a new database as a child of a page.
   */
  async createDatabase(body: any): Promise<TimedAxiosResponse> {
    return (await this.client.post('/databases', body)) as TimedAxiosResponse;
  }

  /**
   * GET /v1/databases/:database_id
   * Retrieves a database object using its ID.
   */
  async getDatabase(databaseId: string): Promise<TimedAxiosResponse> {
    return (await this.client.get(`/databases/${databaseId}`)) as TimedAxiosResponse;
  }

  /**
   * PATCH /v1/databases/:database_id
   * Updates an existing database's title, description or properties.
   */
  async updateDatabase(databaseId: string, body: any): Promise<TimedAxiosResponse> {
    return (await this.client.patch(`/databases/${databaseId}`, body)) as TimedAxiosResponse;
  }

  /**
   * POST /v1/databases/:database_id/query
   * Queries a database and returns filtered/sorted page entries.
   */
  async queryDatabase(databaseId: string, body: any = {}): Promise<TimedAxiosResponse> {
    return (await this.client.post(`/databases/${databaseId}/query`, body)) as TimedAxiosResponse;
  }
}
