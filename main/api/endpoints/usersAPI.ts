// main/api/endpoints/usersAPI.ts
import {
  RequestManager,
  TimedAxiosResponse,
  CustomClientOptions,
} from '../../../core/api/RequestManager';
import { EnvConfig } from '../../../core/utils/envConfig';

export interface ListUsersParams {
  page_size?: number | string;
  start_cursor?: string;
}

/**
 * Business Layer endpoint wrapper for the Notion Users API (Notion-Version: 2025-09-03).
 * Delegates all HTTP transport exclusively to the RequestManager Singleton.
 */
export class UsersAPI {
  private readonly requestManager: RequestManager;

  constructor() {
    this.requestManager = RequestManager.getInstance();
  }

  private resolveClient(options?: CustomClientOptions) {
    if (!options) {
      return this.requestManager.getDefaultClient();
    }

    const effectiveOptions: CustomClientOptions = { ...options };

    if (effectiveOptions.authType === undefined) {
      effectiveOptions.authType = 'bearer';
      effectiveOptions.bearerToken = effectiveOptions.bearerToken ?? EnvConfig.load().token;
    } else if (
      effectiveOptions.authType === 'bearer' &&
      effectiveOptions.bearerToken === undefined
    ) {
      effectiveOptions.bearerToken = EnvConfig.load().token;
    }

    return this.requestManager.getClient(effectiveOptions);
  }

  /**
   * GET /v1/users/me — Retrieve the bot user associated with the active authentication token.
   */
  async getMe(options?: CustomClientOptions): Promise<TimedAxiosResponse> {
    const client = this.resolveClient(options);
    return (await client.get('/users/me')) as TimedAxiosResponse;
  }

  /**
   * GET /v1/users/{user_id} — Retrieve a specific workspace user or bot by UUID.
   */
  async getUser(userId: string, options?: CustomClientOptions): Promise<TimedAxiosResponse> {
    const client = this.resolveClient(options);
    const encodedUserId = encodeURIComponent(userId);
    return (await client.get(`/users/${encodedUserId}`)) as TimedAxiosResponse;
  }

  /**
   * GET /v1/users — List all workspace users with optional cursor-based pagination parameters.
   */
  async listUsers(
    params?: ListUsersParams,
    options?: CustomClientOptions
  ): Promise<TimedAxiosResponse> {
    const client = this.resolveClient(options);
    return (await client.get('/users', { params })) as TimedAxiosResponse;
  }
}
