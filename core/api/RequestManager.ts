// core/api/RequestManager.ts
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { EnvConfig } from '../utils/envConfig';
import { Logger } from '../utils/logger';

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

export class RequestManager {
  private static instance: RequestManager;
  private clientCache: Map<string, AxiosInstance> = new Map();
  private env: EnvConfig;

  // Private constructor prevents external instantiation.
  private constructor() {
    this.env = EnvConfig.load();
  }

  // Global access point to the Singleton.
  public static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  // Returns a cached Axios client or creates a new one.
  public getClient(options: CustomClientOptions = {}): AxiosInstance {
    const cacheKey = JSON.stringify(options);
    if (this.clientCache.has(cacheKey)) {
      return this.clientCache.get(cacheKey)!;
    }

    const client = this.createClient(options);
    this.clientCache.set(cacheKey, client);
    return client;
  }

  // Default Bearer client.
  public getDefaultClient(): AxiosInstance {
    return this.getClient({
      authType: 'bearer',
      bearerToken: this.env.token,
    });
  }

  // Builds the Axios instance with timing and logging interceptors.
  private createClient(options: CustomClientOptions): AxiosInstance {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (!options.omitNotionVersion) {
      headers['Notion-Version'] =
        options.notionVersion !== undefined && options.notionVersion !== null
          ? options.notionVersion
          : this.env.notionVersion;
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

    const instance = axios.create({
      baseURL: this.env.baseUrl,
      timeout: this.env.timeoutMs,
      validateStatus: () => true,
      headers,
    });

    return this.attachTimingInterceptors(instance);
  }

  // Adds latency measurement and debug logging.
  private attachTimingInterceptors(instance: AxiosInstance): AxiosInstance {
    instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      (config as any)._startTime = performance.now();
      Logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    instance.interceptors.response.use((response: AxiosResponse) => {
      const start = (response.config as any)._startTime ?? performance.now();
      (response as TimedAxiosResponse).durationMs = Math.round(performance.now() - start);
      Logger.debug(`Response: ${response.status} (${(response as TimedAxiosResponse).durationMs}ms)`);
      return response;
    });

    return instance;
  }
}