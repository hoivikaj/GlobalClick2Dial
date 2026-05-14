/**
 * Phone number detection using libphonenumber-js (find in text) plus boundary
 * rules for GlobalClick2Dial (IDs, extensions, word attachment).
 *
 * Only US geographic numbers and NANP toll-free (+1) are linked; other regions
 * (e.g. +44, Canada +1) are ignored.
 */

import { findPhoneNumbersInText } from 'libphonenumber-js/max';

const BOUNDARY_BEFORE = /[a-zA-Z0-9_\-]$/;
const BOUNDARY_AFTER = /^[a-zA-Z0-9_\-]/;
/** "Tel … ext" where libphonenumber does not attach ext to the parsed number. */
const TRAILING_EXT_WORD = /^\s+ext\b/i;

const FIND_OPTS = { defaultCountry: 'US', extended: true };

/**
 * @param {{ countryCallingCode: string, country?: string, getType: () => string | undefined }} num
 * @returns {boolean}
 */
function isDialableUsOrTollFree(num) {
  if (num.countryCallingCode !== '1') return false;
  if (num.getType() === 'TOLL_FREE') return true;
  return num.country === 'US';
}

export function digitsOnly(str) {
  return (str || '').replace(/\D/g, '');
}

/**
 * @param {string} text
 * @param {{ startsAt: number, endsAt: number, number: { ext?: string, format: (f: string) => string, isValid: () => boolean } }} hit
 */
function acceptMatch(text, hit) {
  if (hit.startsAt > 0 && BOUNDARY_BEFORE.test(text[hit.startsAt - 1])) {
    return false;
  }
  if (hit.endsAt < text.length && BOUNDARY_AFTER.test(text[hit.endsAt])) {
    return false;
  }
  if (hit.number.ext !== undefined && hit.number.ext !== '') {
    return false;
  }
  if (!hit.number.isValid()) {
    return false;
  }
  if (!isDialableUsOrTollFree(hit.number)) {
    return false;
  }
  if (TRAILING_EXT_WORD.test(text.slice(hit.endsAt))) {
    return false;
  }
  return true;
}

/**
 * @param {string} text
 * @param {string} [_defaultCountryCode] - reserved for API compatibility; detection always uses US (+1) rules
 * @returns {Array<{ start: number, end: number, raw: string, e164: string }>}
 */
export function findPhoneNumbers(text, _defaultCountryCode) {
  const results = [];

  for (const hit of findPhoneNumbersInText(text || '', FIND_OPTS)) {
    if (!acceptMatch(text, hit)) continue;
    const raw = text.slice(hit.startsAt, hit.endsAt);
    results.push({
      start: hit.startsAt,
      end: hit.endsAt,
      raw,
      e164: hit.number.format('E.164')
    });
  }

  return results;
}

const api = { findPhoneNumbers, digitsOnly };
if (typeof globalThis !== 'undefined') {
  globalThis.Click2DialPhoneUtils = api;
}
