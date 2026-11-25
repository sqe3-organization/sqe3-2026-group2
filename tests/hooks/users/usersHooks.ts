// tests/hooks/users/usersHooks.ts
import { expect } from 'vitest';
import { TimedAxiosResponse } from '../../../core/api/RequestManager';
import { EnvConfig } from '../../../core/utils/envConfig';
import { Logger } from '../../../core/utils/logger';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { UsersAPI } from '../../../main/api/endpoints/usersAPI';
import {
  NotionErrorSchema,
  UserObject,
  UserObjectSchema,
  PaginatedUsersListSchema,
} from '../../../main/api/resources/schemas/usersSchemas';

export interface UsersTelemetryEntry {
  testName: string;
  status: number;
  durationMs: number;
}

/**
 * Isolated per-suite Test Context for Users scenarios.
 * Eliminates global mutable variables and hardcoded workspace UUIDs.
 */
export interface UsersTestContext {
  botUserId: string;
  targetUserId: string;
  targetUserType: 'person' | 'bot' | '';
  targetUserName: string | null;
  compactUserId: string;
  firstPageUserId: string;
  nextCursor: string | null;
  hasMoreUsers: boolean;
  telemetry: UsersTelemetryEntry[];
  lastResponse: TimedAxiosResponse | null;
}

export function createUsersTestContext(): UsersTestContext {
  return {
    botUserId: '',
    targetUserId: '',
    targetUserType: '',
    targetUserName: null,
    compactUserId: '',
    firstPageUserId: '',
    nextCursor: null,
    hasMoreUsers: false,
    telemetry: [],
    lastResponse: null,
  };
}

/**
 * Rate-limit guard aligned with Notion API's ~3 requests/second threshold.
 */
export const throttleUsersRequest = (ms = 350): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Precondition hook (beforeAll): dynamically discovers botUserId, a workspace targetUserId,
 * its 32-character compact UUID equivalent, and initial pagination cursor state.
 */
export async function seedUsersContext(
  usersApi: UsersAPI,
  context: UsersTestContext
): Promise<UsersTestContext> {
  const meRes = await usersApi.getMe();
  if (meRes.status === 200) {
    const validatedMe = SchemaValidator.validate(UserObjectSchema, meRes.data);
    if (validatedMe.success && validatedMe.data) {
      context.botUserId = validatedMe.data.id;
    }
  }

  await throttleUsersRequest();

  const listRes = await usersApi.listUsers({ page_size: 100 });
  if (listRes.status === 200) {
    const validatedList = SchemaValidator.validate(PaginatedUsersListSchema, listRes.data);
    if (validatedList.success && validatedList.data && validatedList.data.results.length > 0) {
      const results: UserObject[] = validatedList.data.results;
      const person = results.find((u) => u.type === 'person') ?? results[0];
      const bot = results.find((u) => u.type === 'bot') ?? results[0];

      context.targetUserId = person.id;
      context.targetUserType = person.type;
      context.targetUserName = person.name ?? null;
      context.compactUserId = person.id.replace(/-/g, '');

      if (!context.botUserId && bot) {
        context.botUserId = bot.id;
      }
    }
  }

  await throttleUsersRequest();

  const page1Res = await usersApi.listUsers({ page_size: 1 });
  if (page1Res.status === 200) {
    const validatedPage1 = SchemaValidator.validate(PaginatedUsersListSchema, page1Res.data);
    if (validatedPage1.success && validatedPage1.data && validatedPage1.data.results.length > 0) {
      context.firstPageUserId = validatedPage1.data.results[0].id;
      context.nextCursor = validatedPage1.data.next_cursor;
      context.hasMoreUsers = validatedPage1.data.has_more;
    }
  }

  Logger.info('Seeded UsersTestContext preconditions', {
    botUserId: context.botUserId,
    targetUserId: context.targetUserId,
    hasMoreUsers: context.hasMoreUsers,
  });

  return context;
}

/**
 * Per-test reset hook (beforeEach).
 */
export function resetPerTestUsersState(context: UsersTestContext): void {
  context.lastResponse = null;
}

/**
 * Per-test telemetry hook (afterEach).
 */
export function recordUsersTelemetry(context: UsersTestContext, testName: string): void {
  if (!context.lastResponse) {
    return;
  }

  const entry: UsersTelemetryEntry = {
    testName,
    status: context.lastResponse.status,
    durationMs: context.lastResponse.durationMs,
  };
  context.telemetry.push(entry);
  Logger.debug(`Users telemetry recorded: ${entry.testName}`, entry);
}

/**
 * Postcondition hook (afterAll): logs suite telemetry metrics and wipes context state.
 */
export function cleanupUsersContext(context: UsersTestContext): void {
  Logger.info('Cleaning up UsersTestContext postconditions', {
    executedRequests: context.telemetry.length,
  });

  context.botUserId = '';
  context.targetUserId = '';
  context.targetUserType = '';
  context.targetUserName = null;
  context.compactUserId = '';
  context.firstPageUserId = '';
  context.nextCursor = null;
  context.hasMoreUsers = false;
  context.telemetry.length = 0;
  context.lastResponse = null;
}

/**
 * Resolves an active OAuth access token from environment configuration, falling back
 * to the workspace internal integration token when no public OAuth token is provisioned.
 */
export function getEffectiveOAuthOrBearerToken(): string {
  const rawOAuthToken = process.env.OAUTH_ACCESS_TOKEN || '';
  if (!rawOAuthToken || rawOAuthToken.includes('YOUR_')) {
    return EnvConfig.load().token;
  }
  return rawOAuthToken;
}

/**
 * Resolves the secondary restricted integration token (No user information capability).
 */
export function getRestrictedIntegrationToken(): string {
  return process.env.RESTRICTED_TOKEN || '';
}

/**
 * Verifies common HTTP response headers, traceability identifier, and latency SLA.
 */
export function assertCommonHeadersAndSla(
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
 * Verifies standard Notion API error responses using the Core SchemaValidator.
 */
export function assertNotionErrorContract(
  response: TimedAxiosResponse,
  expectedStatus: number,
  expectedCode: string
): void {
  expect(response.status).toBe(expectedStatus);
  assertCommonHeadersAndSla(response);

  const validated = SchemaValidator.assertValid(NotionErrorSchema, response.data);
  expect(validated.object).toBe('error');
  expect(validated.status).toBe(expectedStatus);
  expect(validated.code).toBe(expectedCode);
  expect(validated.message.length).toBeGreaterThan(0);
}
