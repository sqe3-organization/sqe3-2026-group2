// main/api/endpoints/oauthAPI.ts
import {
  RequestManager,
  TimedAxiosResponse,
  CustomClientOptions,
} from '../../../core/api/RequestManager';

/**
 * Business Layer endpoint wrapper for the Notion OAuth 2.0 API (Notion-Version: 2025-09-03).
 * Uses HTTP Basic authentication via the RequestManager Singleton by default, while allowing
 * CustomClientOptions overrides for negative and boundary contract tests.
 */
export class OAuthAPI {
  private readonly requestManager: RequestManager;

  constructor() {
    this.requestManager = RequestManager.getInstance();
  }

  private resolveClient(options?: CustomClientOptions) {
    const effectiveOptions: CustomClientOptions = {
      authType: 'basic',
      ...options,
    };

    return this.requestManager.getClient(effectiveOptions);
  }

  /**
   * POST /v1/oauth/token — Exchange an authorization_code or refresh_token for an access_token.
   */
  async createToken(
    body: Record<string, unknown>,
    options?: CustomClientOptions
  ): Promise<TimedAxiosResponse> {
    const client = this.resolveClient(options);
    return (await client.post('/oauth/token', body)) as TimedAxiosResponse;
  }

  /**
   * POST /v1/oauth/revoke — Revoke an active OAuth 2.0 access token (RFC 7009).
   */
  async revokeToken(
    body: Record<string, unknown>,
    options?: CustomClientOptions
  ): Promise<TimedAxiosResponse> {
    const client = this.resolveClient(options);
    return (await client.post('/oauth/revoke', body)) as TimedAxiosResponse;
  }

  /**
   * POST /v1/oauth/revoke (raw string body) — Supports malformed JSON negative contract tests
   * without leaking Axios transport logic into the Test Layer.
   */
  async revokeTokenRaw(
    rawPayload: string,
    options?: CustomClientOptions
  ): Promise<TimedAxiosResponse> {
    const client = this.resolveClient({
      ...options,
      extraHeaders: {
        'Content-Type': 'application/json',
        ...options?.extraHeaders,
      },
    });
    return (await client.post('/oauth/revoke', rawPayload)) as TimedAxiosResponse;
  }

  /**
   * POST /v1/oauth/introspect — Inspect active state and metadata of an OAuth token (RFC 7662).
   */
  async introspectToken(
    body: Record<string, unknown>,
    options?: CustomClientOptions
  ): Promise<TimedAxiosResponse> {
    const client = this.resolveClient(options);
    return (await client.post('/oauth/introspect', body)) as TimedAxiosResponse;
  }
}
