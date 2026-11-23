// tests/scenarios/databases/databases.query.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabasesAPI } from '../../../main/api/endpoints/databasesAPI';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { DataFactory } from '../../../core/utils/dataFactory';
import { NotionErrorSchema, PaginatedListSchema } from '../../../main/api/resources/schemas/notionSchemas';
import { createTestDatabase, archiveCreatedDatabases } from '../../hooks/databases/databasesHooks';

const databasesAPI = new DatabasesAPI();
const PARENT_PAGE_ID = process.env.NOTION_TEST_PAGE_ID ?? '';

let testDatabaseId: string;

describe('Databases API — POST /databases/:id/query', () => {
  beforeAll(async () => {
    testDatabaseId = await createTestDatabase(PARENT_PAGE_ID);
  });

  afterAll(async () => {
    await archiveCreatedDatabases();
  });

  it('TC_DB_QUERY_001 - [Positive] Query empty database returns 200 with empty results array', async () => {
    const response = await databasesAPI.queryDatabase(testDatabaseId, {});

    expect(response.status).toBe(200);
    SchemaValidator.assertValid(PaginatedListSchema, response.data);
    expect(response.data.object).toBe('list');
    expect(Array.isArray(response.data.results)).toBe(true);
  });

  it('TC_DB_QUERY_002 - [Positive] Query with page_size=1 returns at most 1 result', async () => {
    const response = await databasesAPI.queryDatabase(testDatabaseId, { page_size: 1 });

    expect(response.status).toBe(200);
    expect(response.data.results.length).toBeLessThanOrEqual(1);
  });

  it('TC_DB_QUERY_003 - [Negative] Query non-existent database returns 404', async () => {
    const response = await databasesAPI.queryDatabase(DataFactory.uuid(), {});

    expect(response.status).toBe(404);
    SchemaValidator.assertValid(NotionErrorSchema, response.data);
  });
});
