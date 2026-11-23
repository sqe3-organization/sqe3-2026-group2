// tests/scenarios/dataSources/dataSources.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { DataSourcesAPI } from '../../../main/api/endpoints/dataSourcesAPI';
import { assertCommonHeadersAndSla } from '../../../core/utils/assertions';

describe('Data Sources Module — Valentina Molina', () => {
  const dataSourcesAPI = new DataSourcesAPI();
  let databaseId = '';
  let dataSourceId = '';

  beforeAll(() => {
    databaseId = process.env.NOTION_DATABASE_ID || '';
    if (!databaseId) {
      throw new Error(
        'NOTION_DATABASE_ID is not set in .env. ' +
        'Copy the ID of a Notion database shared with your integration and add it to .env'
      );
    }
  });

  it('TC_DS_CREATE_001 - [Happy Path] Create a Data Source within a Database', async () => {
    const res = await dataSourcesAPI.createDataSource({
      parent: { type: 'database_id', database_id: databaseId },
      properties: { Name: { title: {} }, Count: { number: { format: 'number' } } },
    });

    // Si falla, imprime el error de Notion para diagnosticar
    if (res.status !== 200) {
      console.error('Notion error:', JSON.stringify(res.data, null, 2));
    }

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);
    expect(res.data.object).toBe('data_source');
    dataSourceId = res.data.id;
  });

  it('TC_DS_GET_001 - [E2E Integrity] Verify the created Data Source exists via GET', async () => {
    const res = await dataSourcesAPI.getDataSource(dataSourceId);
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(dataSourceId);
    expect(res.data.properties).toHaveProperty('Name');
  });
});