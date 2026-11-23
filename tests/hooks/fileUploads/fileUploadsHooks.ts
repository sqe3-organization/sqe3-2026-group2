// tests/hooks/fileUploads/fileUploadsHooks.ts
import { RequestManager } from '../../../core/api/RequestManager';
import { Logger } from '../../../core/utils/logger';

export class FileUploadsHooks {
  private client = RequestManager.getInstance().getDefaultClient();
  private createdFileUploadIds: string[] = [];

  setup() {
    Logger.info('FileUploadsHooks: ready');
  }

  trackFileUpload(id: string) {
    this.createdFileUploadIds.push(id);
  }

  // Postcondición: Notion no permite borrar file_uploads; se limpia el registro local.
  async cleanup() {
    Logger.info(`FileUploadsHooks: ${this.createdFileUploadIds.length} file uploads created (no delete endpoint available)`);
    this.createdFileUploadIds = [];
  }
}