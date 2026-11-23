// tests/scenarios/oauth/oauth.revoke.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { OAuthAPI } from '../../../main/api/endpoints/oauthAPI';
import { OAuthRevokeResponseSchema } from '../../../main/api/resources/schemas/oauthSchemas';
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

describe('OAuth Module — POST /v1/oauth/revoke (RFC 7009 Token Revocation & Idempotency)', () => {
  const oauthApi = new OAuthAPI();
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

  it('TC_OAUTH_REVOKE_001 - [Happy Path] Revoke isolated OAuth token with valid Basic Auth credentials (200 OK)', async () => {
    const isolatedToken =
      context.issuedAccessToken || dataset.oauthIntrospectTokenEdgeCases[0].token!;
    const res = await oauthApi.revokeToken({ token: isolatedToken });
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertOAuthHeadersAndSla(res);
    SchemaValidator.assertValid(OAuthRevokeResponseSchema, res.data);
  });

  it('TC_OAUTH_REVOKE_002 - [Boundary] Verify RFC 7009 idempotency when revoking an already-revoked token (200 OK)', async () => {
    const alreadyRevokedToken =
      context.issuedAccessToken || dataset.oauthIntrospectTokenEdgeCases[0].token!;
    const res = await oauthApi.revokeToken({ token: alreadyRevokedToken });
    context.lastResponse = res;

    expect(res.status).toBe(200);
    assertOAuthHeadersAndSla(res);
    SchemaValidator.assertValid(OAuthRevokeResponseSchema, res.data);
  });

  it('TC_OAUTH_REVOKE_003 - [Negative] Reject token revocation with invalid Basic Auth credentials (401 invalid_client)', async () => {
    const res = await oauthApi.revokeToken(
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

  it('TC_OAUTH_REVOKE_004 - [Negative] Reject revocation when Notion-Version header is omitted (400 missing_version)', async () => {
    const res = await oauthApi.revokeToken(
      { token: dataset.oauthIntrospectTokenEdgeCases[0].token! },
      { omitNotionVersion: true }
    );
    context.lastResponse = res;

    assertOAuthErrorContract(res, 400, ['missing_version', 'validation_error']);
  });

  it('TC_OAUTH_REVOKE_005 - [Negative] Reject malformed raw JSON syntax on /oauth/revoke (400 invalid_json)', async () => {
    const res = await oauthApi.revokeTokenRaw(dataset.oauthRevokeMalformedRawJson);
    context.lastResponse = res;

    assertOAuthErrorContract(res, 400, ['invalid_json', 'validation_error', 'invalid_request']);
  });

  it.each(dataset.oauthRevokeInvalidPayloads)(
    '$testCaseId - [$category] $description ($expectedStatus)',
    async ({ payload, expectedStatus, allowedErrors }) => {
      const res = await oauthApi.revokeToken(payload as Record<string, unknown>);
      context.lastResponse = res;

      assertOAuthErrorContract(res, expectedStatus, allowedErrors);
    }
  );
});
