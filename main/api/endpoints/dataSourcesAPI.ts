// main/api/endpoints/dataSourcesAPI.ts
import { RequestManager, TimedAxiosResponse } from '../../../core/api/RequestManager';

export class DataSourcesAPI {
  private client;

  constructor() {
    this.client = RequestManager.getInstance().getDefaultClient();
  }

  async createDataSource(body: any): Promise<TimedAxiosResponse> {
    return (await this.client.post('/data_sources', body)) as TimedAxiosResponse;
  }

  async getDataSource(dataSourceId: string): Promise<TimedAxiosResponse> {
    return (await this.client.get(`/data_sources/${dataSourceId}`)) as TimedAxiosResponse;
  }

  async updateDataSource(dataSourceId: string, body: any): Promise<TimedAxiosResponse> {
    return (await this.client.patch(`/data_sources/${dataSourceId}`, body)) as TimedAxiosResponse;
  }

  async queryDataSource(dataSourceId: string, body: any): Promise<TimedAxiosResponse> {
    return (await this.client.post(`/data_sources/${dataSourceId}/query`, body)) as TimedAxiosResponse;
  }
}