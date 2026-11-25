// tests/scenarios/users/users.list.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { UsersAPI } from '../../../main/api/endpoints/usersAPI';
import {
  PaginatedUsersListSchema,
  UserObjectSchema,
  UUIDv4Regex,
} from '../../../main/api/resources/schemas/usersSchemas';
import dataset from '../../../main/api/resources/data/users_oauth_dataset.json';
import {
  UsersTestContext,
  createUsersTestContext,
  seedUsersContext,
  throttleUsersRequest,
  resetPerTestUsersState,
  recordUsersTelemetry,
  cleanupUsersContext,
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
} from '../../hooks/users/usersHooks';

describe('Users Module — GET /v1/users (List Workspace Users & Pagination Boundaries)', () => {
  const usersApi = new UsersAPI();
  const context: UsersTestContext = createUsersTestContext();

  beforeAll(async () => {
    await seedUsersContext(usersApi, context);
  });

  beforeEach(async () => {
    resetPerTestUsersState(context);
    await throttleUsersRequest();
  });

  afterEach((testCtx) => {
    recordUsersTelemetry(context, testCtx.task.name);
  });

  afterAll(() => {
    cleanupUsersContext(context);
  });

  it('TC_USERS_LIST_001 - [Happy Path] List workspace users with default pagination (200 OK)', async () => {
    const res = await usersApi.listUsers();
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const validated = SchemaValidator.assertValid(PaginatedUsersListSchema, res.data);
    expect(validated.results.length).toBeGreaterThan(0);
  });

  it('TC_USERS_LIST_002 - [Happy Path] Traverse cursor-based pagination using context nextCursor (200 OK)', async () => {
    const params: { page_size: number; start_cursor?: string } = { page_size: 1 };
    if (context.nextCursor) {
      params.start_cursor = context.nextCursor;
    }

    const res = await usersApi.listUsers(params);
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const validated = SchemaValidator.assertValid(PaginatedUsersListSchema, res.data);
    expect(validated.results.length).toBeGreaterThan(0);

    if (context.firstPageUserId && context.nextCursor) {
      expect(validated.results[0].id).not.toBe(context.firstPageUserId);
    }
  });

  it.each(dataset.pageSizeValidBoundaries)(
    '$testCaseId - [$category] $description ($expectedStatus OK)',
    async ({ pageSize, expectedStatus, maxResultsLength }) => {
      const res = await usersApi.listUsers({ page_size: pageSize });
      context.lastResponse = res;

      expect(res.status).toBe(expectedStatus);
      assertCommonHeadersAndSla(res);

      const validated = SchemaValidator.assertValid(PaginatedUsersListSchema, res.data);
      expect(validated.results.length).toBeLessThanOrEqual(maxResultsLength);
      if (pageSize === 1) {
        expect(validated.results.length).toBe(1);
      }
    }
  );

  it.each(dataset.pageSizeInvalidBoundaries)(
    '$testCaseId - [$category] $description ($expectedStatus $expectedCode)',
    async ({ pageSize, expectedStatus, expectedCode }) => {
      const res = await usersApi.listUsers({ page_size: pageSize });
      context.lastResponse = res;

      assertNotionErrorContract(res, expectedStatus, expectedCode);
    }
  );

  it.each(dataset.invalidStartCursors)(
    '$testCaseId - [$category] $description ($expectedStatus $expectedCode)',
    async ({ startCursor, expectedStatus, expectedCode }) => {
      const res = await usersApi.listUsers({ start_cursor: startCursor });
      context.lastResponse = res;

      assertNotionErrorContract(res, expectedStatus, expectedCode);
    }
  );

  it('TC_USERS_LIST_012 - [Negative] Reject listing users with invalid Bearer token (401 unauthorized)', async () => {
    const res = await usersApi.listUsers(undefined, {
      authType: 'bearer',
      bearerToken: dataset.invalidBearerTokens[0].token,
    });
    context.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_USERS_LIST_013 - [Negative] Reject listing users when Notion-Version header is omitted (400 missing_version)', async () => {
    const res = await usersApi.listUsers(undefined, {
      omitNotionVersion: true,
    });
    context.lastResponse = res;

    assertNotionErrorContract(res, 400, 'missing_version');
  });

  it('TC_USERS_LIST_014 - [E2E] Chain directory page 1 discovery, page 2 cursor traversal, and individual profile lookup', async () => {
    const page1Res = await usersApi.listUsers({ page_size: 1 });
    expect(page1Res.status).toBe(200);
    assertCommonHeadersAndSla(page1Res);

    const page1 = SchemaValidator.assertValid(PaginatedUsersListSchema, page1Res.data);
    expect(page1.results).toHaveLength(1);

    const discoveredUserId = page1.results[0].id;
    expect(discoveredUserId).toMatch(UUIDv4Regex);

    await throttleUsersRequest();

    if (page1.has_more && page1.next_cursor) {
      const page2Res = await usersApi.listUsers({
        page_size: 1,
        start_cursor: page1.next_cursor,
      });
      expect(page2Res.status).toBe(200);
      assertCommonHeadersAndSla(page2Res);

      const page2 = SchemaValidator.assertValid(PaginatedUsersListSchema, page2Res.data);
      expect(page2.results.length).toBeGreaterThan(0);
      expect(page2.results[0].id).not.toBe(discoveredUserId);

      await throttleUsersRequest();
    }

    const profileRes = await usersApi.getUser(discoveredUserId);
    context.lastResponse = profileRes;

    expect(profileRes.status).toBe(200);
    assertCommonHeadersAndSla(profileRes);

    const profile = SchemaValidator.assertValid(UserObjectSchema, profileRes.data);
    expect(profile.id).toBe(discoveredUserId);
  });
});
