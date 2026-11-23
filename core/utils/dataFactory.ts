// core/utils/dataFactory.ts
import { randomUUID } from 'crypto';

/**
 * DataFactory — Core Layer utility.
 * Generates dynamic fake values for use in test data.
 * Has no dependency on any application-specific module.
 */
export class DataFactory {
  /**
   * Returns a random title string with an optional prefix.
   * Example: "Test Page 4f2a"
   */
  static title(prefix = 'Test'): string {
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${prefix} ${suffix}`;
  }

  /**
   * Returns a randomly generated UUID v4.
   */
  static uuid(): string {
    return randomUUID();
  }

  /**
   * Returns a random alphanumeric string of the given length.
   */
  static text(length = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  /**
   * Returns a random placeholder URL.
   */
  static url(): string {
    return `https://example.com/${DataFactory.text(8)}`;
  }

  /**
   * Returns a random integer between min and max (inclusive).
   */
  static integer(min = 1, max = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Picks a random element from the provided array.
   */
  static pick<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }
}
