/**
 * Phone number detection and E.164 normalization for GlobalClick2Dial extension.
 */

(function (global) {
  'use strict';

  // Match phone numbers in various formats; avoids matching inside existing links and scripts.
  // Only match when not immediately preceded or followed by alphanumeric, hyphen, or underscore
  // (so "MAT-25082189552" and "abcd5555555efgh" do not match — number must be separated by
  // space, or by punctuation that starts a phone context like "(", not attached to IDs).
  const PHONE_REGEX = /(?<![a-zA-Z0-9_\-])(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}(?:[-.\s]?\d{1,5})?(?![a-zA-Z0-9_\-])/g;

  const MIN_DIGITS = 7;  // minimum digits to consider a phone number
  const MAX_DIGITS = 15; // E.164 max

  /**
   * Strip non-digits from a string.
   * @param {string} str
   * @returns {string}
   */
  function digitsOnly(str) {
    return (str || '').replace(/\D/g, '');
  }

  /**
   * Normalize a phone number to E.164 format (+countryCode + number).
   * @param {string} raw - Raw matched phone string (e.g. "(555) 123-4567", "+44 20 7123 4567")
   * @param {string} defaultCountryCode - Default country code when none present (e.g. "1" for US)
   * @returns {string|null} E.164 string like "+15551234567" or null if invalid
   */
  function normalizeToE164(raw, defaultCountryCode) {
    const digits = digitsOnly(raw);
    if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;

    // Numbers longer than 10 digits are only valid when prefixed with + (international)
    if (digits.length > 10 && !raw.trim().startsWith('+')) return null;

    const def = (defaultCountryCode || '1').replace(/\D/g, '') || '1';
    let countryCode = '';
    let national = digits;

    if (raw.trim().startsWith('+')) {
      // Has + so try to infer country code (1–4 digits)
      for (let len = 1; len <= 4; len++) {
        const cc = digits.slice(0, len);
        const rest = digits.slice(len);
        if (rest.length >= 7) {
          countryCode = cc;
          national = rest;
          break;
        }
      }
      if (!countryCode) {
        countryCode = def;
        national = digits;
      }
    } else {
      // No + : only up to 10 digits; apply default country code
      if (digits.length === 10 && def === '1') {
        countryCode = '1';
        national = digits;
      } else {
        countryCode = def;
        national = digits;
      }
    }

    return '+' + countryCode + national;
  }

  /**
   * Find all phone number matches in text. Returns array of { start, end, raw, e164 }.
   * @param {string} text
   * @param {string} defaultCountryCode
   * @returns {Array<{start: number, end: number, raw: string, e164: string}>}
   */
  function findPhoneNumbers(text, defaultCountryCode) {
    const results = [];
    let match;
    PHONE_REGEX.lastIndex = 0;
    while ((match = PHONE_REGEX.exec(text)) !== null) {
      const raw = match[0];
      const e164 = normalizeToE164(raw, defaultCountryCode);
      if (e164) {
        results.push({
          start: match.index,
          end: match.index + raw.length,
          raw,
          e164
        });
      }
    }
    return results;
  }

  global.Click2DialPhoneUtils = {
    PHONE_REGEX,
    digitsOnly,
    normalizeToE164,
    findPhoneNumbers,
    MIN_DIGITS,
    MAX_DIGITS
  };
})(typeof window !== 'undefined' ? window : globalThis);
