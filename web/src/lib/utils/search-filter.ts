import { AssetVisibility, type NumberFilter, type SearchFilter as SearchFilterDto } from '@immich/sdk';
import type { MegapixelsMode, MegapixelsTerm, SearchTerms } from '$lib/types';

/** Leeway for every megapixel mode: real files land a little above or below the size a camera is sold as */
export const MEGAPIXELS_TOLERANCE = 0.1;

const megapixelsModes = new Set<MegapixelsMode>(['about', 'atLeast', 'atMost']);

/** Parses what the user typed into the size input; a comma works as the decimal separator */
export const parseMegapixels = (input: string): number | undefined => {
  const text = input.trim().replace(',', '.');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) {
    return undefined;
  }

  const value = Number(text);
  return value > 0 ? value : undefined;
};

/** Terms come from the URL, which the user can edit, so check them before use */
export const isMegapixelsTerm = (term: unknown): term is MegapixelsTerm => {
  if (typeof term !== 'object' || term === null) {
    return false;
  }

  const { mode, value } = term as Record<string, unknown>;
  return (
    megapixelsModes.has(mode as MegapixelsMode) && typeof value === 'number' && Number.isFinite(value) && value > 0
  );
};

// one pixel of precision, so the range doesn't carry float noise like 13.200000000000001
const roundToPixel = (megapixels: number) => Math.round(megapixels * 1_000_000) / 1_000_000;

export const getMegapixelsRange = ({ mode, value }: MegapixelsTerm): NumberFilter => {
  const gte = roundToPixel(value * (1 - MEGAPIXELS_TOLERANCE));
  const lte = roundToPixel(value * (1 + MEGAPIXELS_TOLERANCE));
  switch (mode) {
    case 'atLeast': {
      return { gte };
    }
    case 'atMost': {
      return { lte };
    }
    default: {
      return { gte, lte };
    }
  }
};

export const formatMegapixels = (megapixels: number, locale?: string) =>
  megapixels.toLocaleString(locale, { maximumFractionDigits: 2 });

/** Parses the search page's `query` URL parameter, dropping a malformed megapixels term */
export const parseSearchTerms = (json: string): SearchTerms => {
  const { megapixels, ...terms } = JSON.parse(json) as SearchTerms;
  return isMegapixelsTerm(megapixels) ? { ...terms, megapixels } : terms;
};

const exactTerms = ['country', 'state', 'city', 'make', 'model', 'lensModel'] as const;
const patternTerms = ['originalFileName', 'originalPath', 'description'] as const;

/**
 * Translates the terms the web search UI produces into the structured filter of the search API.
 * The two shapes can't be mixed in one request, and the megapixels filter only exists in the structured one.
 */
export const toSearchFilter = (terms: SearchTerms): SearchFilterDto => {
  const filter: SearchFilterDto = { visibility: { eq: terms.visibility ?? AssetVisibility.Timeline } };

  if (terms.type) {
    filter.type = { eq: terms.type };
  }

  if (terms.isFavorite) {
    filter.isFavorite = { eq: true };
  }

  if (terms.isNotInAlbum) {
    filter.hasAlbums = { eq: false };
  }

  if (terms.takenAfter || terms.takenBefore) {
    filter.takenAt = { gte: terms.takenAfter, lte: terms.takenBefore };
  }

  for (const term of exactTerms) {
    const value = terms[term];
    if (value !== undefined) {
      filter[term] = { eq: value };
    }
  }

  // the flat fields required every listed id
  if (terms.personIds?.length) {
    filter.personIds = { all: terms.personIds };
  }

  if (terms.tagIds === null) {
    filter.hasTags = { eq: false };
  } else if (terms.tagIds?.length) {
    filter.tagIds = { all: terms.tagIds };
  }

  if (terms.rating !== undefined) {
    filter.rating = { eq: terms.rating };
  }

  for (const term of patternTerms) {
    const value = terms[term];
    if (value) {
      filter[term] = { like: value };
    }
  }

  if (terms.ocr) {
    filter.ocr = { matches: terms.ocr };
  }

  if (terms.megapixels) {
    filter.megapixels = getMegapixelsRange(terms.megapixels);
  }

  return filter;
};
