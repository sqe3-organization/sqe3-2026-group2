// core/utils/logger.ts
import path from 'path';
import dotenv from 'dotenv';
import pino, { Logger as PinoLogger, StreamEntry } from 'pino';
import pinoPretty from 'pino-pretty';

dotenv.config();

const SUPPORTED_LEVELS = new Set(['debug', 'info', 'warn', 'error']);

const REDACTED_SECRET_PATHS = [
  'Authorization',
  'authorization',
  'token',
  'bearerToken',
  'access_token',
  'refresh_token',
  'client_secret',
  'OAUTH_CLIENT_SECRET',
  'NOTION_TOKEN',
  '*.Authorization',
  '*.authorization',
  '*.token',
  '*.bearerToken',
  '*.access_token',
  '*.refresh_token',
  '*.client_secret',
  '*.OAUTH_CLIENT_SECRET',
  '*.NOTION_TOKEN',
  'meta.*.Authorization',
  'meta.*.authorization',
  'meta.*.token',
  'meta.*.bearerToken',
  'meta.*.access_token',
  'meta.*.refresh_token',
  'meta.*.client_secret',
  'meta.*.OAUTH_CLIENT_SECRET',
  'meta.*.NOTION_TOKEN',
];

function resolveLogLevel(): string {
  const configuredLevel = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (configuredLevel && SUPPORTED_LEVELS.has(configuredLevel)) {
    return configuredLevel;
  }
  return process.env.DEBUG === 'true' ? 'debug' : 'info';
}

function resolveLogFilePath(): string {
  if (process.env.LOG_FILE_PATH && process.env.LOG_FILE_PATH.trim().length > 0) {
    return path.resolve(process.cwd(), process.env.LOG_FILE_PATH.trim());
  }
  return path.resolve(process.cwd(), 'logs', 'test-execution.log');
}

function normalizeMeta(meta: unknown): Record<string, unknown> | undefined {
  if (meta === undefined) {
    return undefined;
  }
  if (meta instanceof Error) {
    return {
      meta: {
        name: meta.name,
        message: meta.message,
        stack: meta.stack,
      },
    };
  }
  return { meta };
}

/**
 * Core Layer Logger powered by Pino with dual synchronous multistreams:
 *  1. Synchronous NDJSON file stream (`logs/test-execution.log`) for deterministic Vitest capture.
 *  2. Human-readable console stream via `pino-pretty`.
 *
 * Preserves the static API (`info`, `warn`, `error`, `debug`) for full backward compatibility
 * across Core, Business, and Test layers while automatically redacting secret fields.
 */
export class Logger {
  private static instance: PinoLogger | null = null;
  private static logFilePath: string = resolveLogFilePath();

  private static getInstance(): PinoLogger {
    if (!Logger.instance) {
      Logger.logFilePath = resolveLogFilePath();
      const level = resolveLogLevel();

      const fileDestination = pino.destination({
        dest: Logger.logFilePath,
        sync: true,
        mkdir: true,
      });

      const consoleStream = pinoPretty({
        colorize: true,
        translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'",
        ignore: 'pid,hostname',
        sync: true,
      });

      const streams: StreamEntry[] = [
        { level: 'debug', stream: fileDestination },
        { level: 'debug', stream: consoleStream },
      ];

      Logger.instance = pino(
        {
          level,
          base: null,
          timestamp: pino.stdTimeFunctions.isoTime,
          redact: {
            paths: REDACTED_SECRET_PATHS,
            censor: '[REDACTED]',
          },
        },
        pino.multistream(streams)
      );
    }

    return Logger.instance;
  }

  static getLogFilePath(): string {
    return Logger.logFilePath;
  }

  static info(message: string, meta?: any): void {
    const payload = normalizeMeta(meta);
    if (payload) {
      Logger.getInstance().info(payload, message);
    } else {
      Logger.getInstance().info(message);
    }
  }

  static warn(message: string, meta?: any): void {
    const payload = normalizeMeta(meta);
    if (payload) {
      Logger.getInstance().warn(payload, message);
    } else {
      Logger.getInstance().warn(message);
    }
  }

  static error(message: string, meta?: any): void {
    const payload = normalizeMeta(meta);
    if (payload) {
      Logger.getInstance().error(payload, message);
    } else {
      Logger.getInstance().error(message);
    }
  }

  static debug(message: string, meta?: any): void {
    const payload = normalizeMeta(meta);
    if (payload) {
      Logger.getInstance().debug(payload, message);
    } else {
      Logger.getInstance().debug(message);
    }
  }
}
