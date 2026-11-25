// main/api/endpoints/pagesAPI.ts
import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { RequestManager, TimedAxiosResponse } from '../../../core/api/RequestManager';

export interface PageRequestOptions {
  token?: string;
  noAuth?: boolean;
  omitNotionVersion?: boolean;
  notionVersion?: string;
  headers?: Record<string, string>;
}

/**
 *  POST  /v1/pages                                   -> createPage
 *  GET   /v1/pages/{page_id}                         -> getPage
 *  GET   /v1/pages/{page_id}/properties/{property_id} -> getPageProperty
 *  PATCH /v1/pages/{page_id}                         -> updatePage
 *  POST  /v1/pages/{page_id}/move                    -> movePage
 */
export class PagesAPI {
  private readonly manager = RequestManager.getInstance();

  /** POST /v1/pages — creates a page under a page or a row in a data source. */
  async createPage(body: unknown, options?: PageRequestOptions): Promise<TimedAxiosResponse> {
    return this.request('POST', '/pages', body, options);
  }

  /** GET /v1/pages/{page_id} — retrieves a page. `query` is the raw query string (filter_properties). */
  async getPage(pageId: string, query?: string, options?: PageRequestOptions): Promise<TimedAxiosResponse> {
    return this.request('GET', `/pages/${pageId}${query ? `?${query}` : ''}`, undefined, options);
  }

  /**
   * GET /v1/pages/{page_id}/properties/{property_id} — retrieves one property item.
   * Notion returns property IDs already URL-encoded (for example "%3AUPp"), so they are sent as they are.
   */
  async getPageProperty(
    pageId: string,
    propertyId: string,
    query?: string,
    options?: PageRequestOptions
  ): Promise<TimedAxiosResponse> {
    return this.request('GET', `/pages/${pageId}/properties/${propertyId}${query ? `?${query}` : ''}`, undefined, options);
  }

  /** PATCH /v1/pages/{page_id} — updates properties, icon, cover, lock or in_trash. */
  async updatePage(pageId: string, body: unknown, options?: PageRequestOptions): Promise<TimedAxiosResponse> {
    return this.request('PATCH', `/pages/${pageId}`, body, options);
  }

  /** POST /v1/pages/{page_id}/move — moves a page to another page or data source. */
  async movePage(pageId: string, body: unknown, options?: PageRequestOptions): Promise<TimedAxiosResponse> {
    return this.request('POST', `/pages/${pageId}/move`, body, options);
  }

  /** PATCH /v1/pages/{page_id} with in_trash true. Notion has no permanent delete for pages. */
  async trashPage(pageId: string, options?: PageRequestOptions): Promise<TimedAxiosResponse> {
    return this.updatePage(pageId, { in_trash: true }, options);
  }

  private clientFor(options?: PageRequestOptions): AxiosInstance {
    if (!options || (options.token === undefined && !options.noAuth && !options.omitNotionVersion &&
      options.notionVersion === undefined && !options.headers)) {
      return this.manager.getDefaultClient();
    }
    return this.manager.getClient({
      authType: options.noAuth ? 'none' : 'bearer',
      bearerToken: options.noAuth ? undefined : (options.token ?? process.env.NOTION_TOKEN ?? ''),
      omitNotionVersion: options.omitNotionVersion,
      notionVersion: options.notionVersion,
      extraHeaders: options.headers,
    });
  }

  private async request(method: string, url: string, body: unknown, options?: PageRequestOptions) {
    const config: AxiosRequestConfig = { method, url };
    if (method !== 'GET' && body !== undefined && body !== null) {
      config.data = body;
      if (typeof body === 'string') config.transformRequest = [(d) => d];
    }
    return (await this.clientFor(options).request(config)) as TimedAxiosResponse;
  }
}
