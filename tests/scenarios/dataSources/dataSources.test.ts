// tests/scenarios/dataSources/dataSources.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DataSourcesAPI } from '../../../main/api/endpoints/dataSourcesAPI';
import { DataSourcesHooks } from '../../hooks/dataSources/dataSourcesHooks';
import { ValentinaTestContextManager } from '../../hooks/common/valentinaTestContext';
import { assertCommonHeadersAndSla } from '../../../core/utils/assertions';

describe('Data Sources Module — Valentina Molina', () => {
  const dataSourcesAPI = new DataSourcesAPI();
  const hooks = new DataSourcesHooks();
  const ctx = ValentinaTestContextManager.getInstance();

  beforeAll(async () => {
    await hooks.setup();
  });

  afterAll(async () => {
    await hooks.cleanup();
  });

  it('TC_DS_CREATE_001 - [Happy Path] Create a Data Source within a Database', async () => {
    const res = await dataSourcesAPI.createDataSource({
      parent: { type: 'database_id', database_id: ctx.get('databaseId') },
      properties: { Name: { title: {} }, Count: { number: { format: 'number' } } },
    });

    if (res.status !== 200) {
      console.error('Notion error:', JSON.stringify(res.data, null, 2));
    }

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);
    expect(res.data.object).toBe('data_source');

    ctx.set('dataSourceId', res.data.id);
    hooks.trackDataSource(res.data.id);
  });

  it('TC_DS_GET_001 - [E2E Integrity] Verify the created Data Source exists via GET', async () => {
    const res = await dataSourcesAPI.getDataSource(ctx.get('dataSourceId'));
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(ctx.get('dataSourceId'));
    expect(res.data.properties).toHaveProperty('Name');
  });
});