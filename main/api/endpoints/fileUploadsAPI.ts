// main/api/endpoints/fileUploadsAPI.ts
import { RequestManager, TimedAxiosResponse } from '../../../core/api/RequestManager';

export class FileUploadsAPI {
  private client;

  constructor() {
    this.client = RequestManager.getInstance().getDefaultClient();
  }

  async createFileUpload(body: any): Promise<TimedAxiosResponse> {
    return (await this.client.post('/file_uploads', body)) as TimedAxiosResponse;
  }

  async getFileUpload(fileUploadId: string): Promise<TimedAxiosResponse> {
    return (await this.client.get(`/file_uploads/${fileUploadId}`)) as TimedAxiosResponse;
  }

  async sendFile(fileUploadId: string, formData: FormData): Promise<TimedAxiosResponse> {
    return (await this.client.post(`/file_uploads/${fileUploadId}/send`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })) as TimedAxiosResponse;
  }
}