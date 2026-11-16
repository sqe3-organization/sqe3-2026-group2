import { describe, it, expect, beforeAll } from 'vitest';
import {
  notionBearerClient,
  createCustomNotionClient,
  throttleRequest,
  TimedAxiosResponse,
} from '../../src/core/notionClient.js';
import {
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
} from '../../src/core/assertions.js';

describe('Activity #5 & #6 — Valentina Molina (Data Sources, Comments, File Uploads)', () => {
  let databaseId = '';
  let dataSourceId = '';
  let commentId = '';
  let fileUploadId = '';
  let pageId = process.env.NOTION_PAGE_ID || '';

  // Hook: beforeAll — Creamos la base de datos necesaria para las pruebas
  beforeAll(async () => {
    await throttleRequest(350);
    const res = (await notionBearerClient.post('/databases', {
      parent: { type: 'page_id', page_id: pageId },
      title: [{ type: 'text', text: { content: 'DB de Pruebas Valentina' } }],
      properties: { Name: { title: {} } },
    })) as TimedAxiosResponse;

    if (res.status === 200) {
      databaseId = res.data.id;
    }
  });

  describe('Suite 01: Data Sources (Stateless & Happy Path)', () => {
    it('TC_DS_CREATE_001 - [Happy Path] Create a Data Source within a Database', async () => {
      await throttleRequest(350);
      const res = (await notionBearerClient.post('/data_sources', {
        parent: { type: 'database_id', database_id: databaseId },
        properties: { Name: { title: {} }, Count: { number: { format: 'number' } } },
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      assertCommonHeadersAndSla(res);
      expect(res.data.object).toBe('data_source');
      
      dataSourceId = res.data.id;
    });

    it('TC_DS_GET_001 - [E2E Integrity] Verify the created Data Source exists via GET', async () => {
      await throttleRequest(350);
      const res = (await notionBearerClient.get(`/data_sources/${dataSourceId}`)) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(dataSourceId);
      expect(res.data.properties).toHaveProperty('Name');
    });
  });

  describe('Suite 02: Comments (Negative & Happy Path)', () => {
    it('TC_CMT_CREATE_NEG - [Negative Contract] Reject comment creation without Notion-Version header', async () => {
      await throttleRequest(350);
      const noVersionClient = createCustomNotionClient({
        authType: 'bearer',
        bearerToken: process.env.NOTION_TOKEN || '',
        omitNotionVersion: true,
      });
      
      const res = (await noVersionClient.post('/comments', {
        parent: { page_id: pageId },
        rich_text: [{ text: { content: 'Comentario sin version' } }],
      })) as TimedAxiosResponse;

      // Notion debe rechazar esto por falta de header
      assertNotionErrorContract(res, 400, 'missing_version');
    });

    it('TC_CMT_CREATE_001 - [Happy Path] Create a comment on a page successfully', async () => {
      await throttleRequest(350);
      const res = (await notionBearerClient.post('/comments', {
        parent: { page_id: pageId },
        rich_text: [{ text: { content: 'Comentario de prueba automatizado' } }],
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      expect(res.data.object).toBe('comment');
      commentId = res.data.id;
    });
  });

  describe('Suite 03: File Uploads (Stateless Basic Lifecycle)', () => {
    it('TC_FU_CREATE_001 - [Happy Path] Initialize a file upload and verify pending status', async () => {
      await throttleRequest(350);
      const res = (await notionBearerClient.post('/file_uploads', {
        name: 'test_report.pdf',
        content_type: 'application/pdf',
        mode: 'single_part',
      })) as TimedAxiosResponse;

      expect(res.status).toBe(200);
      expect(res.data.object).toBe('file_upload');
      expect(res.data.status).toBe('pending');
      fileUploadId = res.data.id;
    });
    
    it('TC_FU_GET_001 - [Integrity] Retrieve the created file upload ID', async () => {
      await throttleRequest(350);
      const res = (await notionBearerClient.get(`/file_uploads/${fileUploadId}`)) as TimedAxiosResponse;
      
      expect(res.status).toBe(200);
      expect(res.data.id).toBe(fileUploadId);
    });
  });
});