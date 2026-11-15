import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface TimedAxiosResponse<T = any> extends AxiosResponse<T> {
  durationMs: number;
}

export interface CustomClientOptions {
  authType?: 'bearer' | 'basic' | 'none';
  bearerToken?: string;
  basicClientId?: string;
  basicClientSecret?: string;
  notionVersion?: string | null;
  omitNotionVersion?: boolean;
  extraHeaders?: Record<string, string>;
}

export const NOTION_BASE_URL = process.env.NOTION_BASE_URL || 'https://api.notion.com/v1';
export const DEFAULT_NOTION_VERSION = process.env.NOTION_VERSION || '2025-09-03';

function attachTimingInterceptors(instance: AxiosInstance): AxiosInstance {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    (config as any)._startTime = performance.now();
    return config;
  });

  instance.interceptors.response.use((response: AxiosResponse) => {
    const start = (response.config as any)._startTime ?? performance.now();
    (response as TimedAxiosResponse).durationMs = Math.round(performance.now() - start);
    return response;
  });

  return instance;
}

/**
 * Factory helper to create customized Notion Axios clients for positive, boundary,
 * and negative contract testing (e.g., omitting Notion-Version or injecting invalid tokens).
 */
export function createCustomNotionClient(options: CustomClientOptions = {}): AxiosInstance {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (!options.omitNotionVersion) {
    headers['Notion-Version'] =
      options.notionVersion !== undefined && options.notionVersion !== null
        ? options.notionVersion
        : DEFAULT_NOTION_VERSION;
  }

  if (options.authType === 'bearer' && options.bearerToken !== undefined) {
    headers['Authorization'] = `Bearer ${options.bearerToken}`;
  } else if (options.authType === 'basic') {
    const clientId = options.basicClientId ?? process.env.OAUTH_CLIENT_ID ?? '';
    const clientSecret = options.basicClientSecret ?? process.env.OAUTH_CLIENT_SECRET ?? '';
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${encoded}`;
  }

  if (options.extraHeaders) {
    Object.assign(headers, options.extraHeaders);
  }

  const client = axios.create({
    baseURL: NOTION_BASE_URL,
    timeout: 15000,
    validateStatus: () => true, // Never throw on 4xx/5xx responses
    headers,
  });

  return attachTimingInterceptors(client);
}

/**
 * Pre-configured primary Notion Bearer Client for Users, Pages, Blocks, Databases, Data sources, etc.
 */
export const notionBearerClient: AxiosInstance = createCustomNotionClient({
  authType: 'bearer',
  bearerToken: process.env.NOTION_TOKEN || '',
});

/**
 * Pre-configured Notion OAuth 2.0 HTTP Basic Auth Client for /oauth/token, /oauth/revoke, /oauth/introspect.
 */
export const notionBasicOAuthClient: AxiosInstance = createCustomNotionClient({
  authType: 'basic',
  basicClientId: process.env.OAUTH_CLIENT_ID || '',
  basicClientSecret: process.env.OAUTH_CLIENT_SECRET || '',
});

/**
 * Rate-limit guard helper (~3 requests/sec Notion API limit -> 350 ms delay).
 */
export const throttleRequest = (ms = 350): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
