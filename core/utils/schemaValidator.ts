// core/utils/schemaValidator.ts
import { z } from 'zod';

export class SchemaValidator {
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: JSON.stringify(result.error.issues) };
  }

  static assertValid<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new Error(`Schema validation failed: ${JSON.stringify(result.error.issues)}`);
    }
    return result.data;
  }
}