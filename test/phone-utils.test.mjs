import { describe, it, expect } from 'vitest';
import { findPhoneNumbers } from '../src/phone-utils.mjs';

/** Valid US / NANP toll-free (libphonenumber isValid). */
const US_A = '201-555-0123';
const US_B = '202-555-0199';
const US_C = '415-555-1212';
const US_D = '650-253-0000';
const TOLL = '800-234-5678';

const SHOULD_MATCH = [
  { input: 'Call us at (201) 555-0123 for support.', minMatches: 1 },
  { input: US_A, minMatches: 1 },
  { input: '201.555.0123', minMatches: 1 },
  { input: '201 555 0123', minMatches: 1 },
  { input: '2015550123', minMatches: 1 },
  { input: `+1 ${US_A.replace(/-/g, ' ')} and ${TOLL}`, minMatches: 2 },
  { input: `${US_B} is the main line.`, minMatches: 1 },
  { input: `The number is ${US_B}.`, minMatches: 1 },
  { input: `Contact sales, ${US_C}, for pricing.`, minMatches: 1 },
  { input: 'Main office (650) 253-0000 is open 9–5.', minMatches: 1 },
  { input: '+1 201 555 0123', minMatches: 1 },
  { input: `Order #${US_A}`, minMatches: 1 },
  { input: `Tel: ${US_A}`, minMatches: 1 },
  { input: `Call ${US_C} or ${US_D} for help.`, minMatches: 2 },
  { input: `Toll-free: ${TOLL}`, minMatches: 1 }
];

const SHOULD_NOT_MATCH = [
  'MAT-25082189552',
  'abcd2015550123efgh',
  'REF_2015550123',
  '25082189552',
  '111111111111',
  `${US_A}ext`,
  `${US_A} x100`,
  `${US_A} ext`,
  'phone2015550123number',
  'INV-201-5550123',
  '123456789012345',
  '201-55 (only 6 digits)',
  '02.24.2026',
  '25082189552 or 111111111111',
  '+44 20 7123 4567',
  '416-555-0123',
  '020 7123 4567'
];

describe('findPhoneNumbers (US + US toll-free only)', () => {
  for (const row of SHOULD_MATCH) {
    it(`matches: ${row.input.slice(0, 52)}…`, () => {
      const m = findPhoneNumbers(row.input, '1');
      expect(m.length).toBeGreaterThanOrEqual(row.minMatches);
      for (const hit of m) {
        expect(hit.raw).toBe(row.input.slice(hit.start, hit.end));
        expect(hit.e164).toMatch(/^\+1\d{10}$/);
      }
    });
  }

  for (const input of SHOULD_NOT_MATCH) {
    it(`does not match: ${input.slice(0, 56)}${input.length > 56 ? '…' : ''}`, () => {
      expect(findPhoneNumbers(input, '1')).toEqual([]);
    });
  }
});
