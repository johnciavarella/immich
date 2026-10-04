import { goto } from '$app/navigation';
import { searchManager } from '$lib/managers/search-manager.svelte';
import type { MegapixelsTerm } from '$lib/types';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const submittedTerms = () => {
  const url = vi.mocked(goto).mock.calls.at(-1)?.[0] as string;
  return JSON.parse(new URL(url, 'http://localhost').searchParams.get('query') ?? '{}');
};

describe('SearchManager', () => {
  beforeEach(() => {
    localStorage.clear();
    searchManager.reset();
    vi.mocked(goto).mockClear();
  });

  it('defaults to smart search', () => {
    expect(searchManager.filter.queryType).toBe('smart');
  });

  it('remembers the selected query type', () => {
    searchManager.setQueryType('metadata');
    expect(searchManager.filter.queryType).toBe('metadata');

    searchManager.reset();
    expect(searchManager.filter.queryType).toBe('metadata');
  });

  it('overrides a previously stored query type', () => {
    localStorage.setItem('searchQueryType', 'metadata');
    searchManager.reset();

    searchManager.setQueryType('smart');
    searchManager.reset();
    expect(searchManager.filter.queryType).toBe('smart');
  });

  it('ignores an invalid stored query type', () => {
    localStorage.setItem('searchQueryType', 'invalid');
    searchManager.reset();
    expect(searchManager.filter.queryType).toBe('smart');
  });

  describe('resolution', () => {
    it('defaults to an empty about size', () => {
      expect(searchManager.filter.resolution).toEqual({ mode: 'about', input: '' });
    });

    it.each<MegapixelsTerm>([
      { mode: 'about', value: 12 },
      { mode: 'atLeast', value: 5 },
      { mode: 'atMost', value: 0.5 },
    ])('round-trips $mode $value', async (term) => {
      searchManager.setQuery({ megapixels: term });
      expect(searchManager.filter.resolution).toEqual({ mode: term.mode, input: String(term.value) });

      await searchManager.submit();
      expect(submittedTerms().megapixels).toEqual(term);
    });

    it('accepts a comma as the decimal separator', async () => {
      searchManager.filter.resolution.input = '12,5';

      await searchManager.submit();
      expect(submittedTerms().megapixels).toEqual({ mode: 'about', value: 12.5 });
    });

    it('leaves out a size that is not a positive number', async () => {
      searchManager.filter.resolution = { mode: 'atLeast', input: 'big' };

      await searchManager.submit();
      expect(submittedTerms()).not.toHaveProperty('megapixels');
    });

    it('ignores a malformed term from the URL', () => {
      searchManager.setQuery({ megapixels: { mode: 'huge', value: 5 } as unknown as MegapixelsTerm });
      expect(searchManager.filter.resolution).toEqual({ mode: 'about', input: '' });
    });
  });
});
