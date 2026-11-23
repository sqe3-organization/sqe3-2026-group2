// tests/scenarios/fileUploads/fileUploads.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FileUploadsAPI } from '../../../main/api/endpoints/fileUploadsAPI';
import { FileUploadsHooks } from '../../hooks/fileUploads/fileUploadsHooks';
import { ValentinaTestContextManager } from '../../hooks/common/valentinaTestContext';

describe('File Uploads Module — Valentina Molina', () => {
  const fileUploadsAPI = new FileUploadsAPI();
  const hooks = new FileUploadsHooks();
  const ctx = ValentinaTestContextManager.getInstance();

  beforeAll(() => {
    hooks.setup();
  });

  afterAll(async () => {
    await hooks.cleanup();
  });

  it('TC_FU_CREATE_001 - [Happy Path] Initialize a file upload and verify pending status', async () => {
    const res = await fileUploadsAPI.createFileUpload({
      name: 'test_report.pdf',
      content_type: 'application/pdf',
      mode: 'single_part',
    });

    expect(res.status).toBe(200);
    expect(res.data.object).toBe('file_upload');
    expect(res.data.status).toBe('pending');

    ctx.set('fileUploadId', res.data.id);
    hooks.trackFileUpload(res.data.id);
  });

  it('TC_FU_GET_001 - [Integrity] Retrieve the created file upload ID', async () => {
    const res = await fileUploadsAPI.getFileUpload(ctx.get('fileUploadId'));
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(ctx.get('fileUploadId'));
  });
});