import { DateUtils } from './date.utils';

describe('DateUtils', () => {
  describe('getDateRange', () => {
    it('returns start/end of the same calendar day for DAILY frequency', () => {
      const reference = new Date('2026-03-15T14:30:00.000Z');
      const { startDate, endDate } = DateUtils.getDateRange('DAILY', reference);

      expect(startDate.getDate()).toBe(reference.getDate());
      expect(startDate.getHours()).toBe(0);
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
    });

    it('returns start/end of the same calendar month for MONTHLY frequency', () => {
      const reference = new Date('2026-03-15T14:30:00.000Z');
      const { startDate, endDate } = DateUtils.getDateRange('MONTHLY', reference);

      expect(startDate.getDate()).toBe(1);
      expect(startDate.getMonth()).toBe(reference.getMonth());
      expect(endDate.getMonth()).toBe(reference.getMonth());
    });

    it('is case-insensitive on the frequency string', () => {
      const reference = new Date('2026-03-15T14:30:00.000Z');
      const lower = DateUtils.getDateRange('monthly', reference);
      const upper = DateUtils.getDateRange('MONTHLY', reference);
      expect(lower.startDate).toEqual(upper.startDate);
    });

    it('falls back to a daily range for an unrecognized frequency', () => {
      const reference = new Date('2026-03-15T14:30:00.000Z');
      const { startDate, endDate } = DateUtils.getDateRange('UNKNOWN', reference);
      expect(startDate.getHours()).toBe(0);
      expect(endDate.getHours()).toBe(23);
    });
  });

  describe('calculateNextDueDate', () => {
    it('adds one day for DAILY frequency', () => {
      const last = new Date('2026-03-15T10:00:00.000Z');
      const next = DateUtils.calculateNextDueDate(last, 'DAILY');
      expect(next.getUTCDate()).toBe(16);
    });

    it('adds twelve hours for TWICE_DAILY frequency', () => {
      const last = new Date('2026-03-15T10:00:00.000Z');
      const next = DateUtils.calculateNextDueDate(last, 'TWICE_DAILY');
      expect(next.getTime() - last.getTime()).toBe(12 * 60 * 60 * 1000);
    });

    it('adds twelve hours for the real MedicationFrequency.TWICE_DAILY value ("Twice Daily")', () => {
      // Regression test: MedicationFrequency.TWICE_DAILY's actual runtime
      // value is 'Twice Daily' (with a space), not 'TWICE_DAILY'. Every real
      // call site passes `medication.frequency`, i.e. this exact string —
      // the test above only ever exercised the underscored literal, which
      // never occurs in production and masked a bug where this branch never
      // matched, silently returning the *same* timestamp unchanged instead
      // of advancing it.
      const last = new Date('2026-03-15T10:00:00.000Z');
      const next = DateUtils.calculateNextDueDate(last, 'Twice Daily');
      expect(next.getTime() - last.getTime()).toBe(12 * 60 * 60 * 1000);
    });

    it('adds seven days for WEEKLY frequency', () => {
      const last = new Date('2026-03-15T10:00:00.000Z');
      const next = DateUtils.calculateNextDueDate(last, 'WEEKLY');
      expect(next.getTime() - last.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('adds one calendar month for MONTHLY frequency', () => {
      const last = new Date('2026-03-15T10:00:00.000Z');
      const next = DateUtils.calculateNextDueDate(last, 'MONTHLY');
      expect(next.getUTCMonth()).toBe(3); // April (0-indexed)
    });

    it('does not mutate the input date', () => {
      const last = new Date('2026-03-15T10:00:00.000Z');
      const originalTime = last.getTime();
      DateUtils.calculateNextDueDate(last, 'DAILY');
      expect(last.getTime()).toBe(originalTime);
    });
  });

  describe('calculateDaysBetween', () => {
    it('computes whole days between two dates regardless of order', () => {
      const start = new Date('2026-01-01T00:00:00.000Z');
      const end = new Date('2026-01-11T00:00:00.000Z');
      expect(DateUtils.calculateDaysBetween(start, end)).toBe(10);
      expect(DateUtils.calculateDaysBetween(end, start)).toBe(10);
    });

    it('returns 0 for the same date', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      expect(DateUtils.calculateDaysBetween(date, date)).toBe(0);
    });
  });

  describe('calculateExpectedOccurrences', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');

    it('returns one occurrence per day for DAILY frequency', () => {
      const end = new Date('2026-01-11T00:00:00.000Z');
      expect(DateUtils.calculateExpectedOccurrences('DAILY', start, end)).toBe(10);
    });

    it('returns two occurrences per day for TWICE_DAILY frequency', () => {
      const end = new Date('2026-01-11T00:00:00.000Z');
      expect(DateUtils.calculateExpectedOccurrences('TWICE_DAILY', start, end)).toBe(20);
    });

    it('returns two occurrences per day for the real MedicationFrequency.TWICE_DAILY value ("Twice Daily")', () => {
      // Regression test companion to the one in calculateNextDueDate above —
      // this method had the identical underscore-vs-space matching bug,
      // silently returning 0 expected occurrences for every real Twice
      // Daily medication and corrupting adherence-rate calculations.
      const end = new Date('2026-01-11T00:00:00.000Z');
      expect(DateUtils.calculateExpectedOccurrences('Twice Daily', start, end)).toBe(20);
    });

    it('returns ceil(days / 7) for WEEKLY frequency', () => {
      const end = new Date('2026-01-15T00:00:00.000Z'); // 14 days
      expect(DateUtils.calculateExpectedOccurrences('WEEKLY', start, end)).toBe(2);
    });

    it('returns ceil(days / 30) for MONTHLY frequency', () => {
      const end = new Date('2026-02-01T00:00:00.000Z'); // 31 days
      expect(DateUtils.calculateExpectedOccurrences('MONTHLY', start, end)).toBe(2);
    });

    it('returns 0 for an unrecognized frequency', () => {
      const end = new Date('2026-01-11T00:00:00.000Z');
      expect(DateUtils.calculateExpectedOccurrences('UNKNOWN', start, end)).toBe(0);
    });
  });
});
