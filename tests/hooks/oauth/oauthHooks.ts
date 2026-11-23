// tests/hooks/oauth/oauthHooks.ts
import { expect } from 'vitest';
import { TimedAxiosResponse } from '../../../core/api/RequestManager';
import { Logger } from '../../../core/utils/logger';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { OAuthAPI } from '../../../main/api/endpoints/oauthAPI';
import { OAuthErrorSchema } from '../../../main/api/resources/schemas/oauthSchemas';

export interface OAuthTelemetryEntry {
  testName: string;
  status: number;
  durationMs: number;
}

/**
 * Isolated per-suite Test Context for OAuth 2.0 scenarios.
 * Tracks dynamically issued/rotated tokens and guarantees isolated revocation in teardown.
 */
export interface OAuthTestContext {
  clientCredentialsConfigured: boolean;
  redirectUri: string;
  authCode: string;
  refreshToken: string;
  initialAccessToken: string;
  issuedAccessToken: string;
  rotatedAccessToken: string;
  issuedBotId: string;
  disposableTokensToRevoke: string[];
  telemetry: OAuthTelemetryEntry[];
  lastResponse: TimedAxiosResponse | null;
}

export function createOAuthTestContext(): OAuthTestContext {
  return {
    clientCredentialsConfigured: false,
    redirectUri: '',
    authCode: '',
    refreshToken: '',
    initialAccessToken: '',
    issuedAccessToken: '',
    rotatedAccessToken: '',
    issuedBotId: '',
    disposableTokensToRevoke: [],
    telemetry: [],
    lastResponse: null,
  };
}

/**
 * Rate-limit guard aligned with Notion API's ~3 requests/second threshold.
 */
export const throttleOAuthRequest = (ms = 350): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Precondition hook (beforeAll): hydrates OAuth runtime parameters from environment
 * configuration into the typed context without hardcoding secrets in test files.
 */
export function initializeOAuthContext(context: OAuthTestContext): OAuthTestContext {
  const clientId = process.env.OAUTH_CLIENT_ID || '';
  const clientSecret = process.env.OAUTH_CLIENT_SECRET || '';

  context.clientCredentialsConfigured = Boolean(clientId && clientSecret);
  context.redirectUri =
    process.env.OAUTH_REDIRECT_URI || 'https://localhost:3000/auth/notion/callback';
  context.authCode = process.env.OAUTH_AUTH_CODE || '';
  context.refreshToken = process.env.OAUTH_REFRESH_TOKEN || '';
  context.initialAccessToken = process.env.OAUTH_ACCESS_TOKEN || '';

  Logger.info('Initialized OAuthTestContext preconditions', {
    clientCredentialsConfigured: context.clientCredentialsConfigured,
    hasAuthCode: Boolean(context.authCode),
    hasRefreshToken: Boolean(context.refreshToken),
    hasInitialAccessToken: Boolean(context.initialAccessToken),
  });

  return context;
}

/**
 * Registers a disposable OAuth token for guaranteed postcondition revocation during teardown.
 * Explicitly guards against registering the shared internal workspace NOTION_TOKEN.
 */
export function registerDisposableToken(context: OAuthTestContext, token: string): void {
  const workspaceToken = process.env.NOTION_TOKEN || '';
  if (!token || token === workspaceToken) {
    return;
  }
  if (!context.disposableTokensToRevoke.includes(token)) {
    context.disposableTokensToRevoke.push(token);
  }
}

/**
 * Per-test reset hook (beforeEach).
 */
export function resetPerTestOAuthState(context: OAuthTestContext): void {
  context.lastResponse = null;
}

/**
 * Per-test telemetry hook (afterEach).
 */
export function recordOAuthTelemetry(context: OAuthTestContext, testName: string): void {
  if (!context.lastResponse) {
    return;
  }

  const entry: OAuthTelemetryEntry = {
    testName,
    status: context.lastResponse.status,
    durationMs: context.lastResponse.durationMs,
  };
  context.telemetry.push(entry);
  Logger.debug(`OAuth telemetry recorded: ${entry.testName}`, entry);
}

/**
 * Postcondition hook (afterAll): revokes any isolated disposable tokens created during
 * test execution (RFC 7009 idempotent cleanup) and wipes sensitive credentials from memory.
 */
export async function teardownOAuthContext(
  oauthApi: OAuthAPI,
  context: OAuthTestContext
): Promise<void> {
  for (const token of context.disposableTokensToRevoke) {
    try {
      await throttleOAuthRequest();
      await oauthApi.revokeToken({ token });
    } catch (error) {
      Logger.warn('Failed to revoke disposable OAuth token during teardown', { error });
    }
  }

  Logger.info('Completed OAuthTestContext postcondition teardown', {
    revokedDisposableTokens: context.disposableTokensToRevoke.length,
    executedRequests: context.telemetry.length,
  });

  context.authCode = '';
  context.refreshToken = '';
  context.initialAccessToken = '';
  context.issuedAccessToken = '';
  context.rotatedAccessToken = '';
  context.issuedBotId = '';
  context.disposableTokensToRevoke.length = 0;
  context.telemetry.length = 0;
  context.lastResponse = null;
}

/**
 * Verifies common HTTP response headers, traceability identifier, and latency SLA.
 */
export function assertOAuthHeadersAndSla(
  response: TimedAxiosResponse,
  maxSlaMs = 5000
): void {
  const contentType = String(response.headers['content-type'] || '');
  expect(contentType.toLowerCase()).toContain('application/json');

  const traceHeader =
    response.headers['x-notion-request-id'] ||
    response.headers['x-request-id'] ||
    response.headers['cf-ray'] ||
    response.data?.request_id;
  expect(Boolean(traceHeader)).toBe(true);

  expect(typeof response.durationMs).toBe('number');
  expect(response.durationMs).toBeLessThan(maxSlaMs);
}

/**
 * Verifies OAuth 2.0 error responses (both RFC 6749 {"error"} and Notion gateway {"code"})
 * via the Core SchemaValidator.
 */
export function assertOAuthErrorContract(
  response: TimedAxiosResponse,
  expectedStatus: number,
  expectedErrors: string | string[]
): void {
  expect(response.status).toBe(expectedStatus);
  assertOAuthHeadersAndSla(response);

  const validated = SchemaValidator.assertValid(OAuthErrorSchema, response.data);
  const allowed = Array.isArray(expectedErrors) ? expectedErrors : [expectedErrors];
  const actualErrorCode = 'error' in validated ? validated.error : validated.code;
  expect(allowed).toContain(actualErrorCode);
}
