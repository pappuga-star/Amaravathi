import { describe, expect, it } from 'vitest';
import { generateBatchCode, parseBatchCode, isSearchQueryPresent } from './index';

describe('batch code utilities', () => {
  it('generates SOP batch code from bags and purchase date', () => {
    expect(generateBatchCode(30, '2025-12-15')).toBe('30/12/25');
  });

  it('parses SOP batch code', () => {
    expect(parseBatchCode('30/12/25')).toEqual({
      numberOfBags: 30,
      month: 12,
      year: 2025,
    });
  });

  it('parses SOP batch code with suffix gracefully', () => {
    expect(parseBatchCode('30/12/25-2')).toEqual({
      numberOfBags: 30,
      month: 12,
      year: 2025,
    });
    expect(parseBatchCode('10/5/26_A')).toEqual({
      numberOfBags: 10,
      month: 5,
      year: 2026,
    });
  });
});

describe('isSearchQueryPresent utility', () => {
  it('returns false for undefined, null, empty string, and whitespace', () => {
    expect(isSearchQueryPresent(undefined)).toBe(false);
    expect(isSearchQueryPresent(null)).toBe(false);
    expect(isSearchQueryPresent('')).toBe(false);
    expect(isSearchQueryPresent('   ')).toBe(false);
    expect(isSearchQueryPresent('null')).toBe(false);
    expect(isSearchQueryPresent('undefined')).toBe(false);
    expect(isSearchQueryPresent('NULL')).toBe(false);
    expect(isSearchQueryPresent('Undefined')).toBe(false);
  });

  it('returns true for valid search queries', () => {
    expect(isSearchQueryPresent('tea')).toBe(true);
    expect(isSearchQueryPresent('  Assam  ')).toBe(true);
    expect(isSearchQueryPresent('123')).toBe(true);
  });
});

