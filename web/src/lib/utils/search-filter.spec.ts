import { AssetTypeEnum, AssetVisibility, type SearchFilter as SearchFilterDto } from '@immich/sdk';
import type { SearchTerms } from '$lib/types';
import {
  formatMegapixels,
  getMegapixelsRange,
  isMegapixelsTerm,
  parseMegapixels,
  parseSearchTerms,
  toSearchFilter,
} from '$lib/utils/search-filter';

describe(parseMegapixels.name, () => {
  it.each([
    ['12', 12],
    ['12.5', 12.5],
    ['12,5', 12.5],
    [' 0.3 ', 0.3],
    ['.5', 0.5],
    ['48.', 48],
  ])('should parse %j', (input, expected) => {
    expect(parseMegapixels(input)).toBe(expected);
  });

  it.each(['', ' '.repeat(3), '0', '0.0', '-5', 'abc', '1e3', '12 MP', '1.2.3'])('should reject %j', (input) => {
    expect(parseMegapixels(input)).toBeUndefined();
  });
});

describe(isMegapixelsTerm.name, () => {
  it.each([
    { mode: 'about', value: 12 },
    { mode: 'atLeast', value: 5 },
    { mode: 'atMost', value: 0.5 },
  ])('should accept %j', (term) => {
    expect(isMegapixelsTerm(term)).toBe(true);
  });

  it.each([
    null,
    undefined,
    5,
    'about',
    { mode: 'about' },
    { mode: 'about', value: 0 },
    { mode: 'about', value: -1 },
    { mode: 'about', value: '12' },
    { mode: 'about', value: Infinity },
    { mode: 'huge', value: 12 },
  ])('should reject %j', (term) => {
    expect(isMegapixelsTerm(term)).toBe(false);
  });
});

describe(getMegapixelsRange.name, () => {
  it('should widen about by 10% each way', () => {
    expect(getMegapixelsRange({ mode: 'about', value: 12 })).toEqual({ gte: 10.8, lte: 13.2 });
  });

  it('should only set a lower bound for at least', () => {
    expect(getMegapixelsRange({ mode: 'atLeast', value: 5 })).toEqual({ gte: 4.5 });
  });

  it('should only set an upper bound for at most', () => {
    expect(getMegapixelsRange({ mode: 'atMost', value: 5 })).toEqual({ lte: 5.5 });
  });

  it('should round away floating point noise', () => {
    expect(getMegapixelsRange({ mode: 'about', value: 0.3 })).toEqual({ gte: 0.27, lte: 0.33 });
  });
});

describe(formatMegapixels.name, () => {
  it('should use the given locale', () => {
    expect(formatMegapixels(4.5, 'en')).toBe('4.5');
    expect(formatMegapixels(4.5, 'de')).toBe('4,5');
  });

  it('should keep at most two decimals', () => {
    expect(formatMegapixels(48, 'en')).toBe('48');
    expect(formatMegapixels(10.8125, 'en')).toBe('10.81');
  });
});

describe(parseSearchTerms.name, () => {
  it('should keep a valid megapixels term', () => {
    const terms = { city: 'Oslo', megapixels: { mode: 'atMost', value: 5 } };
    expect(parseSearchTerms(JSON.stringify(terms))).toEqual(terms);
  });

  it('should drop a malformed megapixels term', () => {
    expect(parseSearchTerms(JSON.stringify({ city: 'Oslo', megapixels: { mode: 'atMost' } }))).toEqual({
      city: 'Oslo',
    });
  });
});

describe(toSearchFilter.name, () => {
  const timeline = { visibility: { eq: AssetVisibility.Timeline } };

  it('should default to the timeline', () => {
    expect(toSearchFilter({})).toEqual(timeline);
  });

  it.each<[string, SearchTerms, SearchFilterDto]>([
    ['visibility', { visibility: AssetVisibility.Archive }, { visibility: { eq: AssetVisibility.Archive } }],
    ['type', { type: AssetTypeEnum.Video }, { type: { eq: AssetTypeEnum.Video } }],
    ['isFavorite', { isFavorite: true }, { isFavorite: { eq: true } }],
    ['isNotInAlbum', { isNotInAlbum: true }, { hasAlbums: { eq: false } }],
    [
      'takenAfter and takenBefore',
      { takenAfter: '2024-01-01T00:00:00.000Z', takenBefore: '2024-12-31T23:59:59.999Z' },
      { takenAt: { gte: '2024-01-01T00:00:00.000Z', lte: '2024-12-31T23:59:59.999Z' } },
    ],
    ['country', { country: 'Norway' }, { country: { eq: 'Norway' } }],
    ['state', { state: 'Oslo' }, { state: { eq: 'Oslo' } }],
    ['an unknown city', { city: null }, { city: { eq: null } }],
    ['make', { make: 'Canon' }, { make: { eq: 'Canon' } }],
    ['model', { model: 'EOS R5' }, { model: { eq: 'EOS R5' } }],
    ['lensModel', { lensModel: 'RF 50mm' }, { lensModel: { eq: 'RF 50mm' } }],
    ['personIds', { personIds: ['a', 'b'] }, { personIds: { all: ['a', 'b'] } }],
    ['tagIds', { tagIds: ['t'] }, { tagIds: { all: ['t'] } }],
    ['untagged', { tagIds: null }, { hasTags: { eq: false } }],
    ['rating', { rating: 4 }, { rating: { eq: 4 } }],
    ['unrated', { rating: null }, { rating: { eq: null } }],
    ['originalFileName', { originalFileName: 'IMG_' }, { originalFileName: { like: 'IMG_' } }],
    ['originalPath', { originalPath: '/photos/2024' }, { originalPath: { like: '/photos/2024' } }],
    ['description', { description: 'birthday' }, { description: { like: 'birthday' } }],
    ['ocr', { ocr: 'receipt' }, { ocr: { matches: 'receipt' } }],
    ['about N megapixels', { megapixels: { mode: 'about', value: 12 } }, { megapixels: { gte: 10.8, lte: 13.2 } }],
    ['at least N megapixels', { megapixels: { mode: 'atLeast', value: 5 } }, { megapixels: { gte: 4.5 } }],
    ['at most N megapixels', { megapixels: { mode: 'atMost', value: 5 } }, { megapixels: { lte: 5.5 } }],
  ])('should map %s', (_, terms, expected) => {
    expect(toSearchFilter(terms)).toEqual({ ...timeline, ...expected });
  });

  it('should leave out fields the request carries separately', () => {
    expect(toSearchFilter({ query: 'beach', queryAssetId: 'asset-id', withExif: true, page: 2 })).toEqual(timeline);
  });

  it('should skip empty id lists and empty text', () => {
    expect(toSearchFilter({ personIds: [], tagIds: [], originalFileName: '' })).toEqual(timeline);
  });
});
