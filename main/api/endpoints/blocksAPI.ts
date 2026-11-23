// main/api/endpoints/blocksAPI.ts
import {
  CustomClientOptions,
  RequestManager,
  TimedAxiosResponse,
} from '../../../core/api/RequestManager';
import { EnvConfig } from '../../../core/utils/envConfig';

export interface BlockChildrenQueryParams {
  page_size?: number | string;
  start_cursor?: string;
}

/**
 * BlocksAPI — Business Layer endpoint class for the Notion Blocks module.
 * Encapsulates all five /v1/blocks endpoints and delegates HTTP transport
 * exclusively to the RequestManager Singleton.
 */
export class BlocksAPI {
  private readonly requestManager: RequestManager;

  constructor() {
    this.requestManager = RequestManager.getInstance();
  }

  /**
   * Resolves either the default Bearer client or a cached custom client for
   * negative auth / Notion-Version tests. When custom options omit authType,
   * default Bearer credentials from EnvConfig are applied automatically.
   */
  private resolveClient(options?: CustomClientOptions) {
    if (!options) {
      return this.requestManager.getDefaultClient();
    }

    const effectiveOptions: CustomClientOptions =
      options.authType === undefined
        ? {
            authType: 'bearer',
            bearerToken: EnvConfig.load().token,
            ...options,
          }
        : options;

    return this.requestManager.getClient(effectiveOptions);
  }

  /**
   * PATCH /v1/blocks/:id/children
   * Appends new child block objects to an existing parent block or page.
   */
  async appendChildren(
    blockId: string,
    body: Record<string, unknown> | string,
    options?: CustomClientOptions
  ): Promise<TimedAxiosResponse> {
    const client = this.resolveClient(options);
    return (await client.patch(`/blocks/${blockId}/children`, body)) as TimedAxiosResponse;
  }

  /**
   * GET /v1/blocks/:id
   * Retrieves a single block object by its UUID (36-char hyphenated or 32-char compact).
   */
  async getBlock(blockId: string, options?: CustomClientOptions): Promise<TimedAxiosResponse> {
    const client = this.resolveClient(options);
    return (await client.get(`/blocks/${blockId}`)) as TimedAxiosResponse;
  }

  /**
   * GET /v1/blocks/:id/children
   * Retrieves a paginated list of first-level child blocks for a given parent block or page.
   */
  async getChildren(
    blockId: string,
    params?: BlockChildrenQueryParams,
    options?: CustomClientOptions
  ): Promise<TimedAxiosResponse> {
    const client = this.resolveClient(options);
    return (await client.get(`/blocks/${blockId}/children`, { params })) as TimedAxiosResponse;
  }

  /**
   * PATCH /v1/blocks/:id
   * Updates the content or lifecycle state (in_trash / archived) of an existing block.
   */
  async updateBlock(
    blockId: string,
    body: Record<string, unknown> | string,
    options?: CustomClientOptions
  ): Promise<TimedAxiosResponse> {
    const client = this.resolveClient(options);
    return (await client.patch(`/blocks/${blockId}`, body)) as TimedAxiosResponse;
  }

  /**
   * DELETE /v1/blocks/:id
   * Soft-deletes (moves to trash) an existing block and its nested descendants.
   */
  async deleteBlock(blockId: string, options?: CustomClientOptions): Promise<TimedAxiosResponse> {
    const client = this.resolveClient(options);
    return (await client.delete(`/blocks/${blockId}`)) as TimedAxiosResponse;
  }
}
