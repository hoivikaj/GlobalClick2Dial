import { describe, it, expect } from 'vitest';
import {
  parseDomainList,
  hostMatchesPattern,
  shouldRunOnPage,
  buildHref,
  hasAtLeastDigits
} from '../src/content-helpers.mjs';

describe('parseDomainList', () => {
  it('splits and trims', () => {
    expect(parseDomainList(' a.com , b.com ')).toEqual(['a.com', 'b.com']);
  });
  it('empty', () => {
    expect(parseDomainList('')).toEqual([]);
  });
});

describe('hostMatchesPattern', () => {
  it('exact match', () => {
    expect(hostMatchesPattern('example.com', 'example.com')).toBe(true);
  });
  it('wildcard suffix', () => {
    expect(hostMatchesPattern('www.example.com', '*.example.com')).toBe(true);
    expect(hostMatchesPattern('example.com', '*.example.com')).toBe(true);
  });
});

describe('shouldRunOnPage', () => {
  it('blacklist blocks listed host', () => {
    expect(shouldRunOnPage('evil.com', 'blacklist', 'evil.com')).toBe(false);
  });
  it('whitelist allows only listed', () => {
    expect(shouldRunOnPage('good.com', 'whitelist', 'good.com')).toBe(true);
    expect(shouldRunOnPage('bad.com', 'whitelist', 'good.com')).toBe(false);
  });
});

describe('buildHref', () => {
  it('tel and callto', () => {
    expect(buildHref('tel', '', '+12015550123')).toBe('tel:+12015550123');
    expect(buildHref('callto', '', '+12015550123')).toBe('callto:+12015550123');
  });
  it('zoomphonecall', () => {
    expect(buildHref('zoomphonecall', '', '+12015550123')).toBe('zoomphonecall://+12015550123');
  });
  it('custom with slash suffix unchanged', () => {
    expect(buildHref('custom', 'myapp://call/', '+12015550123')).toBe('myapp://call/+12015550123');
  });
  it('custom without separator appends', () => {
    expect(buildHref('custom', 'myapp', '+12015550123')).toBe('myapp+12015550123');
  });
});

describe('hasAtLeastDigits', () => {
  it('counts digits', () => {
    expect(hasAtLeastDigits('abc12-345-67', 7)).toBe(true);
    expect(hasAtLeastDigits('abc12', 7)).toBe(false);
  });
});
