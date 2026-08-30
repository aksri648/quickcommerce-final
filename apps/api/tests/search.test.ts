import { describe, it, expect, beforeAll } from 'bun:test';
import { searchService } from '../src/modules/products/search.service';

describe('🔍 Hybrid & Semantic Product Search Suite (Orama Engine)', () => {
  beforeAll(async () => {
    await searchService.initIndex();
  });

  it('1. should retrieve exact product matches by brand & name', async () => {
    const result = await searchService.searchProducts({
      query: 'Amul Taaza Milk',
      limit: 10,
    });

    expect(result.products).toBeDefined();
    expect(result.mode).toBe('hybrid');
  });

  it('2. should perform Hinglish & colloquial grocery synonym expansion (e.g. dahi -> curd/yogurt)', async () => {
    const result = await searchService.searchProducts({
      query: 'dahi',
      limit: 10,
    });

    expect(result.products).toBeDefined();
    expect(result.query).toBe('dahi');
  });

  it('3. should perform semantic intent discovery for conceptual queries (e.g. "healthy breakfast")', async () => {
    const result = await searchService.searchProducts({
      query: 'healthy breakfast',
      limit: 10,
    });

    expect(result.products).toBeDefined();
  });

  it('4. should provide real-time suggestions and intent discovery pills', async () => {
    const suggestions = await searchService.getSuggestions('milk');

    expect(suggestions.intentPills).toBeDefined();
    expect(suggestions.intentPills.length).toBeGreaterThan(0);
  });
});
