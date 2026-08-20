import { describe, it, expect } from 'vitest';
import { escapeLikePattern, normalizeSearchTitle } from '../search-utils';

describe('escapeLikePattern', () => {
  it('leaves plain text alone', () => {
    expect(escapeLikePattern('quantum computing')).toBe('quantum computing');
  });

  it('escapes percent so it matches literally instead of everything', () => {
    expect(escapeLikePattern('100% method')).toBe('100\\% method');
  });

  it('escapes underscore so it matches literally instead of any-char', () => {
    expect(escapeLikePattern('snake_case')).toBe('snake\\_case');
  });

  it('escapes backslash itself', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
  });

  it('handles all three specials together', () => {
    expect(escapeLikePattern('\\%_')).toBe('\\\\\\%\\_');
  });
});

describe('normalizeSearchTitle', () => {
  it('lowercases and trims', () => {
    expect(normalizeSearchTitle('  Quantum Computing ')).toBe('quantum computing');
  });

  it('collapses internal whitespace runs', () => {
    expect(normalizeSearchTitle('Quantum \t  Computing')).toBe('quantum computing');
  });

  it('makes differently-typed versions of the same query collide (cache hit)', () => {
    expect(normalizeSearchTitle('  ENTROPY ')).toBe(normalizeSearchTitle('entropy'));
  });
});
