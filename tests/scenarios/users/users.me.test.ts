// tests/scenarios/users/users.me.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { UsersAPI } from '../../../main/api/endpoints/usersAPI';
import { UserObjectSchema, UUIDv4Regex } from '../../../main/api/resources/schemas/usersSchemas';
import dataset from '../../../main/api/resources/data/users_oauth_dataset.json';
import {
  UsersTestContext,
  createUsersTestContext,
  throttleUsersRequest,
  resetPerTestUsersState,
  recordUsersTelemetry,
  cleanupUsersContext,
  getEffectiveOAuthOrBearerToken,
  assertCommonHeadersAndSla,
  assertNotionErrorContract,
} from '../../hooks/users/usersHooks';

describe('Users Module — GET /v1/users/me (Retrieve Token Bot User)', () => {
  const usersApi = new UsersAPI();
  const context: UsersTestContext = createUsersTestContext();

  beforeAll(() => {
    resetPerTestUsersState(context);
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

  it('TC_USERS_ME_001 - [Happy Path] Retrieve bot user profile with valid Internal Integration Token (200 OK)', async () => {
    const res = await usersApi.getMe();
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const validated = SchemaValidator.assertValid(UserObjectSchema, res.data);
    expect(validated.object).toBe('user');
    expect(validated.type).toBe('bot');
    expect(validated.id).toMatch(UUIDv4Regex);
    expect(typeof validated.name).toBe('string');
    expect(validated.bot?.owner).toBeDefined();

    context.botUserId = validated.id;
  });

  it('TC_USERS_ME_002 - [Happy Path] Retrieve bot profile and workspace upload limits with active OAuth/Bearer token (200 OK)', async () => {
    const res = await usersApi.getMe({
      authType: 'bearer',
      bearerToken: getEffectiveOAuthOrBearerToken(),
    });
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const validated = SchemaValidator.assertValid(UserObjectSchema, res.data);
    expect(validated.object).toBe('user');
    expect(validated.type).toBe('bot');
    expect(validated.bot?.workspace_limits?.max_file_upload_size_in_bytes).toBeGreaterThan(0);
  });

  it.each(dataset.invalidBearerTokens)(
    '$testCaseId - [$category] $description ($expectedStatus $expectedCode)',
    async ({ token, expectedStatus, expectedCode }) => {
      const res = await usersApi.getMe({
        authType: 'bearer',
        bearerToken: token,
      });
      context.lastResponse = res;

      assertNotionErrorContract(res, expectedStatus, expectedCode);
    }
  );

  it('TC_USERS_ME_004 - [Negative] Reject request when Authorization header is omitted (401 unauthorized)', async () => {
    const res = await usersApi.getMe({ authType: 'none' });
    context.lastResponse = res;

    assertNotionErrorContract(res, 401, 'unauthorized');
  });

  it('TC_USERS_ME_005 - [Negative] Enforce contract when Notion-Version header is missing (400 missing_version)', async () => {
    const res = await usersApi.getMe({ omitNotionVersion: true });
    context.lastResponse = res;

    assertNotionErrorContract(res, 400, 'missing_version');
  });

  it('TC_USERS_ME_006 - [Negative] Reject unsupported Notion-Version header string (400 validation_error)', async () => {
    const res = await usersApi.getMe({ notionVersion: '2099-99-99' });
    context.lastResponse = res;

    assertNotionErrorContract(res, 400, 'validation_error');
  });

  it('TC_USERS_ME_008 - [Boundary] Verify sequential rate-limit contract and SLA compliance on GET /v1/users/me (200 OK)', async () => {
    const res = await usersApi.getMe();
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertCommonHeadersAndSla(res);

    const validated = SchemaValidator.assertValid(UserObjectSchema, res.data);
    expect(validated.object).toBe('user');
    expect(validated.type).toBe('bot');
    if (context.botUserId) {
      expect(validated.id).toBe(context.botUserId);
    }
  });
});
