<script lang="ts">
  import { searchManager } from '$lib/managers/search-manager.svelte';
  import { locale } from '$lib/stores/preferences.store';
  import type { MegapixelsMode } from '$lib/types';
  import {
    formatMegapixels,
    getMegapixelsRange,
    MEGAPIXELS_TOLERANCE,
    parseMegapixels,
  } from '$lib/utils/search-filter';
  import { Field, Input, Text } from '@immich/ui';
  import { t, type Translations } from 'svelte-i18n';
  import SearchButton from './SearchButton.svelte';

  interface Props {
    onSearch: () => void;
  }

  let { onSearch }: Props = $props();

  let filters = $derived(searchManager.filter.resolution);
  let megapixels = $derived(parseMegapixels(filters.input));
  let invalid = $derived(filters.input.trim() !== '' && megapixels === undefined);

  const tolerance = Math.round(MEGAPIXELS_TOLERANCE * 100);

  const modes: Array<{ mode: MegapixelsMode; label: Translations }> = [
    { mode: 'about', label: 'search_filter_resolution_about' },
    { mode: 'atLeast', label: 'search_filter_resolution_at_least' },
    { mode: 'atMost', label: 'search_filter_resolution_at_most' },
  ];

  const onkeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') {
      return;
    }

    // search like the panel's Search button; a plain form submit trips the empty main input's required check
    event.preventDefault();
    if (!invalid) {
      onSearch();
    }
  };

  const getHint = () => {
    if (invalid) {
      return $t('search_filter_resolution_invalid');
    }

    if (megapixels === undefined) {
      return $t('search_filter_resolution_hint_empty');
    }

    const { gte, lte } = getMegapixelsRange({ mode: filters.mode, value: megapixels });
    const min = gte === undefined ? '' : formatMegapixels(gte, $locale);
    const max = lte === undefined ? '' : formatMegapixels(lte, $locale);
    switch (filters.mode) {
      case 'atLeast': {
        return $t('search_filter_resolution_hint_at_least', { values: { min, tolerance } });
      }
      case 'atMost': {
        return $t('search_filter_resolution_hint_at_most', { values: { max, tolerance } });
      }
      default: {
        return $t('search_filter_resolution_hint_about', { values: { min, max, tolerance } });
      }
    }
  };
</script>

<div id="resolution-selection">
  <fieldset>
    <Text class="py-5" fontWeight="medium">{$t('resolution')}</Text>
    <div class="flex flex-wrap gap-2">
      {#each modes as { mode, label } (mode)}
        <SearchButton checked active={filters.mode === mode} onclick={() => (filters.mode = mode)}>
          {$t(label)}
        </SearchButton>
      {/each}
    </div>
  </fieldset>
  <div class="grid grid-auto-fill-40 gap-2 pt-4">
    <Field label={$t('size')} {invalid}>
      <Input
        bind:value={filters.input}
        inputmode="decimal"
        autocomplete="off"
        trailingText="MP"
        aria-describedby="resolution-hint"
        {onkeydown}
      />
    </Field>
  </div>
  <Text id="resolution-hint" class="pt-2" size="tiny" color={invalid ? 'danger' : 'muted'} aria-live="polite">
    {getHint()}
  </Text>
</div>
