// tests/scenarios/databases/databases.create.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabasesAPI } from '../../../main/api/endpoints/databasesAPI';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { DataFactory } from '../../../core/utils/dataFactory';
import { NotionErrorSchema } from '../../../main/api/resources/schemas/notionSchemas';
import { archiveCreatedDatabases, createdDatabaseIds } from '../../hooks/databases/databasesHooks';
import { z } from 'zod';

const databasesAPI = new DatabasesAPI();

// ── Minimal Zod schema for a Databases object ────────────────────────────────
const DatabaseObjectSchema = z.object({
  object: z.literal('database'),
  id: z.string(),
  title: z.array(z.any()),
  properties: z.record(z.string(), z.any()),
});

// ── Parent page provided via .env (must exist in the connected workspace) ────
const PARENT_PAGE_ID = process.env.NOTION_TEST_PAGE_ID ?? '';

describe('Databases API — POST /databases', () => {
  afterAll(async () => {
    await archiveCreatedDatabases();
  });

  it('TC_DB_POST_001 - [Positive] Create a database with a title property returns 200', async () => {
    const body = {
      parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
      title: [{ type: 'text', text: { content: DataFactory.title('Test DB') } }],
      properties: { Name: { title: {} } },
    };

    const response = await databasesAPI.createDatabase(body);

    expect(response.status).toBe(200);
    expect(response.durationMs).toBeLessThan(10_000);
    SchemaValidator.assertValid(DatabaseObjectSchema, response.data);
    expect(response.data.object).toBe('database');
    createdDatabaseIds.push(response.data.id);
  });

  it('TC_DB_POST_002 - [Negative] Missing parent returns 400', async () => {
    const body = {
      title: [{ type: 'text', text: { content: 'No parent DB' } }],
      properties: { Name: { title: {} } },
    };

    const response = await databasesAPI.createDatabase(body as any);

    expect(response.status).toBe(400);
    SchemaValidator.assertValid(NotionErrorSchema, response.data);
    expect(response.data.code).toBeTruthy();
  });

  it('TC_DB_POST_003 - [Negative] Invalid parent ID returns 400', async () => {
    const body = {
      parent: { type: 'page_id', page_id: 'not-a-valid-uuid' },
      title: [{ type: 'text', text: { content: DataFactory.title('Bad Parent DB') } }],
      properties: { Name: { title: {} } },
    };

    const response = await databasesAPI.createDatabase(body);

    expect([400, 404]).toContain(response.status);
    SchemaValidator.assertValid(NotionErrorSchema, response.data);
  });
});
