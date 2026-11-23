// tests/scenarios/fileUploads/fileUploads.test.ts
import { describe, it, expect } from 'vitest';
import { FileUploadsAPI } from '../../../main/api/endpoints/fileUploadsAPI';

describe('File Uploads Module — Valentina Molina', () => {
  const fileUploadsAPI = new FileUploadsAPI();
  let fileUploadId = '';

  it('TC_FU_CREATE_001 - [Happy Path] Initialize a file upload and verify pending status', async () => {
    const res = await fileUploadsAPI.createFileUpload({
      name: 'test_report.pdf',
      content_type: 'application/pdf',
      mode: 'single_part',
    });

    expect(res.status).toBe(200);
    expect(res.data.object).toBe('file_upload');
    expect(res.data.status).toBe('pending');
    fileUploadId = res.data.id;
  });

  it('TC_FU_GET_001 - [Integrity] Retrieve the created file upload ID', async () => {
    const res = await fileUploadsAPI.getFileUpload(fileUploadId);
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(fileUploadId);
  });
});