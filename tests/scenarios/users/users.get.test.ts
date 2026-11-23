// tests/scenarios/users/users.get.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { UsersAPI } from '../../../main/api/endpoints/usersAPI';
import {
  UserObjectSchema,
  UUIDv4Regex,
  CompactHex32Regex,
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
  getRestrictedIntegrationToken,
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
} from '../../hooks/users/usersHooks';

describe('Users Module — GET /v1/users/{user_id} (Retrieve a Specific User)', () => {
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

  it('TC_USERS_GET_001 - [Happy Path] Retrieve workspace user profile via seeded canonical UUIDv4 (200 OK)', async () => {
    expect(context.targetUserId).toMatch(UUIDv4Regex);

    const res = await usersApi.getUser(context.targetUserId);
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const validated = SchemaValidator.assertValid(UserObjectSchema, res.data);
    expect(validated.id).toBe(context.targetUserId);
    expect(['person', 'bot']).toContain(validated.type);
  });

  it('TC_USERS_GET_002 - [Happy Path] Retrieve bot user profile via seeded botUserId (200 OK)', async () => {
    expect(context.botUserId).toMatch(UUIDv4Regex);

    const res = await usersApi.getUser(context.botUserId);
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const validated = SchemaValidator.assertValid(UserObjectSchema, res.data);
    expect(validated.id).toBe(context.botUserId);
    expect(validated.type).toBe('bot');
  });

  it('TC_USERS_GET_003 - [Boundary] Accept compact 32-char hex UUID and normalize response to 36-char UUIDv4 (200 OK)', async () => {
    expect(context.compactUserId).toMatch(CompactHex32Regex);

    const res = await usersApi.getUser(context.compactUserId);
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const validated = SchemaValidator.assertValid(UserObjectSchema, res.data);
    expect(validated.id).toHaveLength(36);
    expect(validated.id).toMatch(UUIDv4Regex);
    expect(validated.id.replace(/-/g, '').toLowerCase()).toBe(context.compactUserId.toLowerCase());
    expect(validated.id).toBe(context.targetUserId);
  });

  it.each(dataset.invalidUserIds)(
    '$testCaseId - [$category] $description ($expectedStatus $expectedCode)',
    async ({ userId, expectedStatus, expectedCode }) => {
      const res = await usersApi.getUser(userId);
      context.lastResponse = res;

      assertNotionErrorContract(res, expectedStatus, expectedCode);
    }
  );

  it('TC_USERS_GET_012 - [Negative] Reject query with invalid Bearer token (401 unauthorized)', async () => {
    const res = await usersApi.getUser(context.targetUserId, {
      authType: 'bearer',
      bearerToken: dataset.invalidBearerTokens[0].token,
    });
    context.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_USERS_GET_013 - [Negative] Reject query when Notion-Version header is omitted (400 missing_version)', async () => {
    const res = await usersApi.getUser(context.targetUserId, {
      omitNotionVersion: true,
    });
    context.lastResponse = res;

    assertNotionErrorContract(res, 400, 'missing_version');
  });

  it('TC_USERS_GET_014 - [Negative] Reject query when token lacks Read User Information capability (403 restricted_resource)', async () => {
    const res = await usersApi.getUser(context.targetUserId, {
      authType: 'bearer',
      bearerToken: getRestrictedIntegrationToken(),
    });
    context.lastResponse = res;

    assertNotionErrorContract(res, 403, 'restricted_resource');
  });

  it('TC_USERS_GET_015 - [E2E] Verify hyphenated vs compact UUID profile equivalence and 401 denial on discovered user', async () => {
    const hyphenatedRes = await usersApi.getUser(context.targetUserId);
    expect(hyphenatedRes.status).toBe(200);
    const baseline = SchemaValidator.assertValid(UserObjectSchema, hyphenatedRes.data);

    await throttleUsersRequest();

    const compactRes = await usersApi.getUser(context.compactUserId);
    expect(compactRes.status).toBe(200);
    const normalized = SchemaValidator.assertValid(UserObjectSchema, compactRes.data);

    expect(normalized.id).toBe(baseline.id);
    expect(normalized.name).toBe(baseline.name);
    expect(normalized.type).toBe(baseline.type);

    await throttleUsersRequest();

    const deniedRes = await usersApi.getUser(context.targetUserId, {
      authType: 'bearer',
      bearerToken: dataset.invalidBearerTokens[0].token,
    });
    context.lastResponse = deniedRes;

    assertNotionErrorContract(deniedRes, 401, 'unauthorized');
  });
});
