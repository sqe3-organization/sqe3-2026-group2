// tests/scenarios/oauth/oauth.introspect.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { OAuthAPI } from '../../../main/api/endpoints/oauthAPI';
import { UsersAPI } from '../../../main/api/endpoints/usersAPI';
import {
  OAuthIntrospectResponseSchema,
  OAuthRevokeResponseSchema,
} from '../../../main/api/resources/schemas/oauthSchemas';
import dataset from '../../../main/api/resources/data/users_oauth_dataset.json';
import {
  OAuthTestContext,
  createOAuthTestContext,
  initializeOAuthContext,
  throttleOAuthRequest,
  resetPerTestOAuthState,
  recordOAuthTelemetry,
  teardownOAuthContext,
  assertOAuthHeadersAndSla,
  assertOAuthErrorContract,
} from '../../hooks/oauth/oauthHooks';
import { assertNotionErrorContract } from '../../hooks/users/usersHooks';

describe('OAuth Module — POST /v1/oauth/introspect (RFC 7662 Token Introspection & Lifecycle)', () => {
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

  it('TC_OAUTH_INTROSPECT_001 - [Happy Path] Introspect OAuth access_token and validate RFC 7662 contract (200 OK)', async () => {
    const subjectToken =
      context.initialAccessToken || dataset.oauthIntrospectTokenEdgeCases[0].token!;
    const res = await oauthApi.introspectToken({ token: subjectToken });
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertOAuthHeadersAndSla(res);

    const validated = SchemaValidator.assertValid(OAuthIntrospectResponseSchema, res.data);
    expect(typeof validated.active).toBe('boolean');
  });

  it.each(dataset.oauthIntrospectTokenEdgeCases)(
    '$testCaseId - [$category] $description',
    async (entry) => {
      const tokenValue =
        'token' in entry && entry.token
          ? entry.token
          : entry.repeatSeed!.repeat(entry.repeatCount!);

      if ('expectedLength' in entry && entry.expectedLength) {
        expect(tokenValue).toHaveLength(entry.expectedLength);
      }

      const res = await oauthApi.introspectToken({ token: tokenValue });
      context.lastResponse = res;

      expect(res.status).toBe(entry.expectedStatus);
      assertOAuthHeadersAndSla(res);

      const validated = SchemaValidator.assertValid(OAuthIntrospectResponseSchema, res.data);
      expect(validated.active).toBe(entry.expectedActive);
    }
  );

  it.each(dataset.oauthIntrospectInvalidPayloads)(
    '$testCaseId - [$category] $description ($expectedStatus)',
    async ({ payload, expectedStatus, allowedErrors }) => {
      const res = await oauthApi.introspectToken(payload as Record<string, unknown>);
      context.lastResponse = res;

      assertOAuthErrorContract(res, expectedStatus, allowedErrors);
    }
  );

  it('TC_OAUTH_INTROSPECT_009 - [Negative] Reject introspection with invalid Basic Auth credentials (401 invalid_client)', async () => {
    const res = await oauthApi.introspectToken(
      { token: dataset.oauthIntrospectTokenEdgeCases[0].token! },
      {
        authType: 'basic',
        basicClientId: 'invalid_client',
        basicClientSecret: 'invalid_secret',
      }
    );
    context.lastResponse = res;

    assertOAuthErrorContract(res, 401, ['invalid_client', 'unauthorized']);
  });

  it('TC_OAUTH_INTROSPECT_010 - [Negative] Reject introspection when Notion-Version header is omitted (400 missing_version)', async () => {
    const res = await oauthApi.introspectToken(
      { token: dataset.oauthIntrospectTokenEdgeCases[0].token! },
      { omitNotionVersion: true }
    );
    context.lastResponse = res;

    assertOAuthErrorContract(res, 400, ['missing_version', 'validation_error']);
  });

  it('TC_OAUTH_INTROSPECT_011 - [E2E] Verify full OAuth token lifecycle (introspect -> revoke -> re-introspect active: false -> /users/me 401 denial)', async () => {
    const disposableToken =
      context.issuedAccessToken || dataset.oauthIntrospectTokenEdgeCases[0].token!;

    const initialIntrospect = await oauthApi.introspectToken({ token: disposableToken });
    expect(initialIntrospect.status).toBe(200);
    assertOAuthHeadersAndSla(initialIntrospect);
    SchemaValidator.assertValid(OAuthIntrospectResponseSchema, initialIntrospect.data);

    await throttleOAuthRequest();

    const revokeRes = await oauthApi.revokeToken({ token: disposableToken });
    expect(revokeRes.status).toBe(200);
    assertOAuthHeadersAndSla(revokeRes);
    SchemaValidator.assertValid(OAuthRevokeResponseSchema, revokeRes.data);

    await throttleOAuthRequest();

    const postRevokeIntrospect = await oauthApi.introspectToken({ token: disposableToken });
    expect(postRevokeIntrospect.status).toBe(200);
    assertOAuthHeadersAndSla(postRevokeIntrospect);
    const introspected = SchemaValidator.assertValid(
      OAuthIntrospectResponseSchema,
      postRevokeIntrospect.data
    );
    expect(introspected.active).toBe(false);

    await throttleOAuthRequest();

    const deniedMeRes = await usersApi.getMe({
      authType: 'bearer',
      bearerToken: disposableToken,
    });
    context.lastResponse = deniedMeRes;

    assertNotionErrorContract(deniedMeRes, 401, 'unauthorized');
  });
});
