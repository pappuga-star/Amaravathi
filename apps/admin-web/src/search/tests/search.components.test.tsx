import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SearchInput } from '../SearchInput';
import { AutocompleteSearchInput } from '../AutocompleteSearchInput';
import { SearchSuggestionsDropdown } from '../SearchSuggestionsDropdown';
import { SearchDidYouMean } from '../SearchDidYouMean';
import { SearchNoResults } from '../SearchNoResults';
import { SearchHealthDashboard } from '../SearchHealthDashboard';

describe('search components', () => {
  it('SearchInput renders loading and clear states', () => {
    const clearHtml = renderToStaticMarkup(<SearchInput value="roy" onChange={() => {}} />);
    expect(clearHtml).toContain('Clear search');

    const loadingHtml = renderToStaticMarkup(<SearchInput value="roy" onChange={() => {}} loading />);
    expect(loadingHtml).toContain('animate-spin');
  });

  it('AutocompleteSearchInput renders input and options shell', () => {
    const html = renderToStaticMarkup(
      <AutocompleteSearchInput value="Ro" onChange={() => {}} options={['Royal', 'Premium']} />,
    );
    expect(html).toContain('Search...');
    expect(html).toContain('value="Ro"');
  });

  it('Suggestions dropdown and did-you-mean render', () => {
    const html = renderToStaticMarkup(
      <>
        <SearchSuggestionsDropdown suggestions={[{ text: 'Royal', type: 'entity' }]} onSelect={() => {}} />
        <SearchDidYouMean suggestion="Premium" onSelect={() => {}} />
      </>,
    );
    expect(html).toContain('Suggestions');
    expect(html).toContain('Did you mean');
  });

  it('NoResults and HealthDashboard render expected sections', () => {
    const html = renderToStaticMarkup(
      <>
        <SearchNoResults query="zzz" didYouMean="royal" alternatives={['premium']} onSelect={() => {}} />
        <SearchHealthDashboard
          health={{
            cacheProvider: 'memory',
            activeSearchEngine: 'prefix',
            redisConnected: false,
            cacheSize: 1,
            cacheHitRatioPct: 70,
            p95LatencyMs: 10,
            averageLatencyMs: 5,
            slowQueryCount: 0,
            invalidationCount: 0,
          }}
        />
      </>,
    );
    expect(html).toContain('No matches found');
    expect(html).toContain('Cache Provider');
    expect(html).toContain('p95 Latency');
  });
});
