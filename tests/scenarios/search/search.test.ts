// tests/scenarios/search/search.test.ts
import { describe, it, expect } from 'vitest';
import { SearchAPI } from '../../../main/api/endpoints/searchAPI';
import { SchemaValidator } from '../../../core/utils/schemaValidator';
import { NotionErrorSchema, PaginatedListSchema } from '../../../main/api/resources/schemas/notionSchemas';

const searchAPI = new SearchAPI();

describe('Search API — POST /search', () => {
  it('TC_SEARCH_001 - [Positive] Search with empty body returns 200 and paginated list', async () => {
    const response = await searchAPI.search({});

    expect(response.status).toBe(200);
    expect(response.durationMs).toBeLessThan(15_000);
    SchemaValidator.assertValid(PaginatedListSchema, response.data);
    expect(response.data.object).toBe('list');
  });

  it('TC_SEARCH_002 - [Positive] Search filtered by page object type returns only pages', async () => {
    const response = await searchAPI.search({
      filter: { value: 'page', property: 'object' },
    });

    expect(response.status).toBe(200);
    SchemaValidator.assertValid(PaginatedListSchema, response.data);
    for (const result of response.data.results) {
      expect(result.object).toBe('page');
    }
  });

  it('TC_SEARCH_003 - [Positive] Search filtered by database object type returns only databases', async () => {
    const response = await searchAPI.search({
      filter: { value: 'database', property: 'object' },
    });

    expect(response.status).toBe(200);
    SchemaValidator.assertValid(PaginatedListSchema, response.data);
    for (const result of response.data.results) {
      expect(result.object).toBe('database');
    }
  });

  it('TC_SEARCH_004 - [Positive] Search with specific query returns relevant results', async () => {
    const response = await searchAPI.search({
      query: 'Test',
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
    });

    expect(response.status).toBe(200);
    SchemaValidator.assertValid(PaginatedListSchema, response.data);
  });

  it('TC_SEARCH_005 - [Positive] Search with page_size=1 returns at most 1 result', async () => {
    const response = await searchAPI.search({ page_size: 1 });

    expect(response.status).toBe(200);
    expect(response.data.results.length).toBeLessThanOrEqual(1);
  });

  it('TC_SEARCH_006 - [Negative] Search with invalid sort direction returns 400', async () => {
    const response = await searchAPI.search({
      sort: { direction: 'invalid_dir' as any, timestamp: 'last_edited_time' },
    });

    expect([400, 422]).toContain(response.status);
    SchemaValidator.assertValid(NotionErrorSchema, response.data);
  });
});
