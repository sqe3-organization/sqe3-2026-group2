// core/utils/envConfig.ts
import dotenv from 'dotenv';

dotenv.config();

export class EnvConfig {
  private static instance: EnvConfig;

  public readonly baseUrl: string;
  public readonly notionVersion: string;
  public readonly token: string;
  public readonly timeoutMs: number;

  private constructor() {
    this.baseUrl = process.env.NOTION_BASE_URL || 'https://api.notion.com/v1';
    this.notionVersion = process.env.NOTION_VERSION || '2025-09-03';
    this.token = process.env.NOTION_TOKEN || '';
    this.timeoutMs = parseInt(process.env.TIMEOUT_MS || '15000', 10);

    if (!this.token) {
      throw new Error('NOTION_TOKEN is not defined in .env');
    }
  }

  public static load(): EnvConfig {
    if (!EnvConfig.instance) {
      EnvConfig.instance = new EnvConfig();
    }
    return EnvConfig.instance;
  }
}