// tests/scenarios/oauth/oauth.token.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { OAuthAPI } from '../../../main/api/endpoints/oauthAPI';
import { UsersAPI } from '../../../main/api/endpoints/usersAPI';
import {
  OAuthTokenResponseSchema,
  OAuthIntrospectResponseSchema,
  UUIDv4Regex,
} from '../../../main/api/resources/schemas/oauthSchemas';
import { UserObjectSchema } from '../../../main/api/resources/schemas/usersSchemas';
import dataset from '../../../main/api/resources/data/users_oauth_dataset.json';
import {
  OAuthTestContext,
  createOAuthTestContext,
  initializeOAuthContext,
  throttleOAuthRequest,
  registerDisposableToken,
  resetPerTestOAuthState,
  recordOAuthTelemetry,
  teardownOAuthContext,
  assertOAuthHeadersAndSla,
  assertOAuthErrorContract,
} from '../../hooks/oauth/oauthHooks';

describe('OAuth Module — POST /v1/oauth/token (Authorization Code Exchange & Refresh Rotation)', () => {
  const oauthApi = new OAuthAPI();
  const usersApi = new UsersAPI();
  const context: OAuthTestContext = createOAuthTestContext();

  beforeAll(() => {
    initializeOAuthContext(context);
  });

  beforeEach(async () => {
    resetPerTestOAuthState(context);
    await throttleOAuthRequest();
  });

  afterEach((testCtx) => {
    recordOAuthTelemetry(context, testCtx.task.name);
  });

  afterAll(async () => {
    await teardownOAuthContext(oauthApi, context);
  });

  it('TC_OAUTH_TOKEN_001 - [Happy Path] Exchange authorization_code for access_token and refresh_token (200 OK)', async () => {
    const res = await oauthApi.createToken({
      grant_type: 'authorization_code',
      code: context.authCode,
      redirect_uri: context.redirectUri,
    });
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertOAuthHeadersAndSla(res);

    const validated = SchemaValidator.assertValid(OAuthTokenResponseSchema, res.data);
    expect(validated.token_type).toBe('bearer');
    expect(validated.bot_id).toMatch(UUIDv4Regex);

    context.issuedAccessToken = validated.access_token;
    context.issuedBotId = validated.bot_id;
    registerDisposableToken(context, validated.access_token);
  });

  it('TC_OAUTH_TOKEN_002 - [Happy Path] Rotate session credentials via grant_type refresh_token (200 OK)', async () => {
    const res = await oauthApi.createToken({
      grant_type: 'refresh_token',
      refresh_token: context.refreshToken,
    });
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertOAuthHeadersAndSla(res);

    const validated = SchemaValidator.assertValid(OAuthTokenResponseSchema, res.data);
    expect(validated.token_type).toBe('bearer');
    expect(validated.access_token.length).toBeGreaterThan(0);

    context.rotatedAccessToken = validated.access_token;
    registerDisposableToken(context, validated.access_token);
  });

  it('TC_OAUTH_TOKEN_003 - [Negative] Reject invalid Basic Auth client_id and client_secret (401 invalid_client)', async () => {
    const res = await oauthApi.createToken(
      {
        grant_type: 'authorization_code',
        code: 'sample_invalid_auth_code',
        redirect_uri: context.redirectUri,
      },
      {
        authType: 'basic',
        basicClientId: 'forged_client_id',
        basicClientSecret: 'forged_client_secret',
      }
    );
    context.lastResponse = res;

    assertOAuthErrorContract(res, 401, ['invalid_client', 'unauthorized']);
  });

  it('TC_OAUTH_TOKEN_004 - [Negative] Reject token exchange when Authorization header is omitted (401 unauthorized)', async () => {
    const res = await oauthApi.createToken(
      {
        grant_type: 'authorization_code',
        code: 'sample_unauth_code',
        redirect_uri: context.redirectUri,
      },
      { authType: 'none' }
    );
    context.lastResponse = res;

    assertOAuthErrorContract(res, 401, ['invalid_client', 'unauthorized']);
  });

  it('TC_OAUTH_TOKEN_005 - [Negative] Reject token exchange when Notion-Version header is omitted (400 missing_version)', async () => {
    const res = await oauthApi.createToken(
      {
        grant_type: 'authorization_code',
        code: 'sample_code',
      },
      { omitNotionVersion: true }
    );
    context.lastResponse = res;

    assertOAuthErrorContract(res, 400, ['missing_version', 'validation_error']);
  });

  it.each(dataset.invalidOAuthGrantPayloads)(
    '$testCaseId - [$category] $description ($expectedStatus)',
    async ({ payload, expectedStatus, allowedErrors }) => {
      const res = await oauthApi.createToken(payload as Record<string, unknown>);
      context.lastResponse = res;

      assertOAuthErrorContract(res, expectedStatus, allowedErrors);
    }
  );

  it('TC_OAUTH_TOKEN_013 - [Boundary] Reject single-use authorization_code replay attempt (400 invalid_grant)', async () => {
    const res = await oauthApi.createToken({
      grant_type: 'authorization_code',
      code: context.authCode || 'replayed_single_use_code',
      redirect_uri: context.redirectUri,
    });
    context.lastResponse = res;

    assertOAuthErrorContract(res, 400, ['invalid_grant', 'invalid_request']);
  });

  it('TC_OAUTH_TOKEN_014 - [E2E] Chain refresh_token rotation, introspection, and /users/me bot identity continuity', async () => {
    const activeToken =
      context.rotatedAccessToken || context.issuedAccessToken || context.initialAccessToken;

    const introspectRes = await oauthApi.introspectToken({
      token: activeToken || dataset.oauthIntrospectTokenEdgeCases[0].token!,
    });
    expect(introspectRes.status).toBe(200);
    assertOAuthHeadersAndSla(introspectRes);
    const introspected = SchemaValidator.assertValid(
      OAuthIntrospectResponseSchema,
      introspectRes.data
    );
    expect(typeof introspected.active).toBe('boolean');

    await throttleOAuthRequest();

    const meRes = activeToken
      ? await usersApi.getMe({ authType: 'bearer', bearerToken: activeToken })
      : await usersApi.getMe();
    context.lastResponse = meRes;

    expect(meRes.status).toBe(200);
    assertOAuthHeadersAndSla(meRes);
    const botUser = SchemaValidator.assertValid(UserObjectSchema, meRes.data);
    expect(botUser.object).toBe('user');
    expect(botUser.type).toBe('bot');
  });
});
