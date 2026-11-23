// tests/scenarios/dataSources/dataSources.extra.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DataSourcesAPI } from '../../../main/api/endpoints/dataSourcesAPI';
import { DataSourcesHooks } from '../../hooks/dataSources/dataSourcesHooks';
import { ValentinaTestContextManager } from '../../hooks/common/valentinaTestContext';
import { assertCommonHeadersAndSla, assertNotionErrorContract } from '../../../core/utils/assertions';

describe('Data Sources Module — Extra Tests (Valentina Molina)', () => {
  const dataSourcesAPI = new DataSourcesAPI();
  const hooks = new DataSourcesHooks();
  const ctx = ValentinaTestContextManager.getInstance();

  beforeAll(async () => {
    await hooks.setup();
  });

  afterAll(async () => {
    await hooks.cleanup();
  });

  it('TC_DS_UPDATE_001 - [Happy Path] Update a Data Source title', async () => {
    // Crear un Data Source primero (con title válido)
    const createRes = await dataSourcesAPI.createDataSource({
      parent: { type: 'database_id', database_id: ctx.get('databaseId') },
      properties: { Name: { title: {} } },
    });
    expect(createRes.status).toBe(200);
    const dsId = createRes.data.id;
    hooks.trackDataSource(dsId);

    // Actualizar el título (Notion espera title en la raíz del body, no en properties)
    const updateRes = await dataSourcesAPI.updateDataSource(dsId, {
      title: [{ type: 'text', text: { content: 'Updated Data Source Title' } }],
    });

    expect(updateRes.status).toBe(200);
    assertCommonHeadersAndSla(updateRes);
    expect(updateRes.data.title[0].text.content).toBe('Updated Data Source Title');
  });

  it('TC_DS_QUERY_001 - [Happy Path] Query a Data Source with no filters', async () => {
    const createRes = await dataSourcesAPI.createDataSource({
      parent: { type: 'database_id', database_id: ctx.get('databaseId') },
      properties: { Name: { title: {} } },
    });
    expect(createRes.status).toBe(200);
    const dsId = createRes.data.id;
    hooks.trackDataSource(dsId);

    const queryRes = await dataSourcesAPI.queryDataSource(dsId, { page_size: 10 });
    expect(queryRes.status).toBe(200);
    assertCommonHeadersAndSla(queryRes);
    expect(queryRes.data.object).toBe('list');
    expect(Array.isArray(queryRes.data.results)).toBe(true);
  });

  it('TC_DS_GET_NEG_001 - [Negative] Reject GET with invalid data source ID', async () => {
    const res = await dataSourcesAPI.getDataSource('invalid-id-123');
    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_DS_UPDATE_NEG_001 - [Negative] Reject update with unsupported property type', async () => {
    // Crear un Data Source primero
    const createRes = await dataSourcesAPI.createDataSource({
      parent: { type: 'database_id', database_id: ctx.get('databaseId') },
      properties: { Name: { title: {} } },
    });
    expect(createRes.status).toBe(200);
    const dsId = createRes.data.id;
    hooks.trackDataSource(dsId);

    // Intentar actualizar con una propiedad de tipo no soportado
    const updateRes = await dataSourcesAPI.updateDataSource(dsId, {
      properties: { InvalidProp: { unsupported_type: {} } },
    });
    assertNotionErrorContract(updateRes, 400, 'validation_error');
  });
});