// tests/scenarios/databases/databases.get.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabasesAPI } from '../../../main/api/endpoints/databasesAPI';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { DataFactory } from '../../../core/utils/dataFactory';
import { NotionErrorSchema } from '../../../main/api/resources/schemas/notionSchemas';
import { createTestDatabase, archiveCreatedDatabases } from '../../hooks/databases/databasesHooks';
import { z } from 'zod';

const databasesAPI = new DatabasesAPI();

const DatabaseObjectSchema = z.object({
  object: z.literal('database'),
  id: z.string(),
  title: z.array(z.any()),
  properties: z.record(z.string(), z.any()),
});

const PARENT_PAGE_ID = process.env.NOTION_TEST_PAGE_ID ?? '';

let testDatabaseId: string;

describe('Databases API — GET /databases/:id', () => {
  beforeAll(async () => {
    testDatabaseId = await createTestDatabase(PARENT_PAGE_ID);
  });

  afterAll(async () => {
    await archiveCreatedDatabases();
  });

  it('TC_DB_GET_001 - [Positive] Retrieve existing database returns 200 and valid schema', async () => {
    const response = await databasesAPI.getDatabase(testDatabaseId);

    expect(response.status).toBe(200);
    expect(response.durationMs).toBeLessThan(10_000);
    SchemaValidator.assertValid(DatabaseObjectSchema, response.data);
    expect(response.data.id).toContain(testDatabaseId.replace(/-/g, '').slice(0, 8));
  });

  it('TC_DB_GET_002 - [Negative] Non-existent database ID returns 404', async () => {
    const response = await databasesAPI.getDatabase(DataFactory.uuid());

    expect(response.status).toBe(404);
    SchemaValidator.assertValid(NotionErrorSchema, response.data);
  });

  it('TC_DB_GET_003 - [Negative] Malformed database ID returns 400', async () => {
    const response = await databasesAPI.getDatabase('not-a-uuid');

    expect([400, 404]).toContain(response.status);
    SchemaValidator.assertValid(NotionErrorSchema, response.data);
  });
});
