// tests/hooks/databases/databasesHooks.ts
import { DatabasesAPI } from '../../../main/api/endpoints/databasesAPI';
import { DataFactory } from '../../../core/utils/dataFactory';
import { Logger } from '../../../core/utils/logger';

/**
 * DatabasesHooks — Test Layer hooks for the Databases module.
 * Provides precondition helpers (create parent DB) and
 * postcondition helpers (archive created databases).
 */

const databasesAPI = new DatabasesAPI();

/** IDs created during the test run, to be archived in afterAll. */
export const createdDatabaseIds: string[] = [];

/**
 * Creates a minimal inline database inside the given parent page.
 * Returns the database ID to be stored in the test context.
 */
export async function createTestDatabase(parentPageId: string): Promise<string> {
  const body = {
    parent: { type: 'page_id', page_id: parentPageId },
    title: [
      {
        type: 'text',
        text: { content: DataFactory.title('Test DB') },
      },
    ],
    properties: {
      Name: { title: {} },
    },
  };

  const response = await databasesAPI.createDatabase(body);

  if (response.status !== 200) {
    Logger.error('Failed to create test database in precondition', {
      status: response.status,
      body: response.data,
    });
    throw new Error(`createTestDatabase precondition failed with status ${response.status}`);
  }

  const databaseId: string = response.data.id;
  createdDatabaseIds.push(databaseId);
  Logger.info(`[DatabasesHooks] Created test database: ${databaseId}`);
  return databaseId;
}

/**
 * Archives all databases created during the test suite.
 * Should be called in afterAll to clean up the Notion workspace.
 */
export async function archiveCreatedDatabases(): Promise<void> {
  for (const dbId of createdDatabaseIds) {
    try {
      await databasesAPI.updateDatabase(dbId, { archived: true });
      Logger.info(`[DatabasesHooks] Archived database: ${dbId}`);
    } catch (err) {
      Logger.warn(`[DatabasesHooks] Could not archive database ${dbId}`, err);
    }
  }
  createdDatabaseIds.length = 0;
}
