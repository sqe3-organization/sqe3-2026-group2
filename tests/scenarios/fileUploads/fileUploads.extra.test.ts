// tests/scenarios/fileUploads/fileUploads.extra.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FileUploadsAPI } from '../../../main/api/endpoints/fileUploadsAPI';
import { FileUploadsHooks } from '../../hooks/fileUploads/fileUploadsHooks';
import { ValentinaTestContextManager } from '../../hooks/common/valentinaTestContext';
import { assertCommonHeadersAndSla, assertNotionErrorContract } from '../../../core/utils/assertions';

describe('File Uploads Module — Extra Tests (Valentina Molina)', () => {
  const fileUploadsAPI = new FileUploadsAPI();
  const hooks = new FileUploadsHooks();
  const ctx = ValentinaTestContextManager.getInstance();

  beforeAll(() => {
    hooks.setup();
  });

  afterAll(async () => {
    await hooks.cleanup();
  });

    it('TC_FU_CREATE_002 - [Happy Path] Create a single-part file upload with valid content type', async () => {
    const res = await fileUploadsAPI.createFileUpload({
        name: 'single_part_test.txt',
        content_type: 'text/plain',
        mode: 'single_part',
    });

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);
    expect(res.data.object).toBe('file_upload');
    expect(res.data.status).toBe('pending');
    hooks.trackFileUpload(res.data.id);
    });

    it('TC_FU_CREATE_NEG_001 - [Negative] Reject file upload with invalid content_type', async () => {
    const res = await fileUploadsAPI.createFileUpload({
        name: 'invalid.exe',
        content_type: 'application/x-invalid-type',
        mode: 'single_part',
    });
    assertNotionErrorContract(res, 400, 'validation_error');
    });

  it('TC_FU_CREATE_NEG_002 - [Negative] Reject file upload with invalid mode', async () => {
    const res = await fileUploadsAPI.createFileUpload({
      name: 'test.pdf',
      content_type: 'application/pdf',
      mode: 'invalid_mode',
    });
    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_FU_GET_NEG_001 - [Negative] Reject GET with invalid file upload ID', async () => {
    const res = await fileUploadsAPI.getFileUpload('invalid-file-upload-id');
    assertNotionErrorContract(res, 400, 'validation_error');
  });
});