// tests/scenarios/dataSources/dataSources.data-driven.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DataSourcesAPI } from '../../../main/api/endpoints/dataSourcesAPI';
import { DataSourcesHooks } from '../../hooks/dataSources/dataSourcesHooks';
import { ValentinaTestContextManager } from '../../hooks/common/valentinaTestContext';
import testCases from '../../../main/api/resources/data/dataSources_test_cases.json';

describe('Data Sources Module — Data-Driven Tests (GenAI Dataset)', () => {
  const dataSourcesAPI = new DataSourcesAPI();
  const hooks = new DataSourcesHooks();
  const ctx = ValentinaTestContextManager.getInstance();

  beforeAll(async () => {
    await hooks.setup();
  });

  afterAll(async () => {
    await hooks.cleanup();
  });

  // Iteramos sobre cada caso del dataset generado por GenAI
  testCases.forEach((tc) => {
    it(`${tc.case_id} - [${tc.category}] ${tc.description}`, async () => {
      // Reemplazamos el placeholder {{DATABASE_ID}} con el ID real del contexto
      const payload = JSON.parse(
        JSON.stringify(tc.payload).replace(/\{\{DATABASE_ID\}\}/g, ctx.get('databaseId'))
      );

      const res = await dataSourcesAPI.createDataSource(payload);

      // Si el caso es válido, imprimimos el error para diagnosticar
      if (res.status !== tc.expected_status) {
        console.error(`Case ${tc.case_id} failed. Expected ${tc.expected_status}, got ${res.status}`);
        console.error('Response:', JSON.stringify(res.data, null, 2));
      }

      expect(res.status).toBe(tc.expected_status);

      // Si el caso es happy_path, registramos el ID para limpieza
      if (tc.expected_status === 200 && res.data.id) {
        hooks.trackDataSource(res.data.id);
      }
    },20000);
  });
});