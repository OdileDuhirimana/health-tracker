import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

export class DateUtils {
  /**
   * Normalizes a frequency string for switch-case matching.
   *
   * `MedicationFrequency.TWICE_DAILY`'s actual runtime value is the
   * human-readable string `'Twice Daily'` (see `entities/medication.entity.ts`),
   * which upper-cases to `'TWICE DAILY'` (a space) — not `'TWICE_DAILY'` (an
   * underscore). Every `switch` in this class previously matched on the
   * underscored form directly against `frequency.toUpperCase()`, so it
   * silently never matched for real Twice Daily medications: every method
   * here fell through to its `default`/no-op behavior for them specifically
   * (`calculateNextDueDate` returned the *same* timestamp instead of
   * advancing it — making a Twice Daily medication appear permanently
   * overdue immediately after being dispensed; `calculateExpectedOccurrences`
   * returned 0, corrupting adherence-rate math for any patient on a Twice
   * Daily medication). Collapsing whitespace to underscores here fixes every
   * call site at once rather than patching each switch individually.
   */
  private static normalizeFrequency(frequency: string): string {
    return frequency.toUpperCase().replace(/\s+/g, '_');
  }

  static getDateRange(frequency: string, referenceDate: Date): { startDate: Date; endDate: Date } {
    switch (this.normalizeFrequency(frequency)) {
      case 'DAILY':
        return {
          startDate: startOfDay(referenceDate),
          endDate: endOfDay(referenceDate),
        };
      case 'MONTHLY':
        return {
          startDate: startOfMonth(referenceDate),
          endDate: endOfMonth(referenceDate),
        };
      case 'WEEKLY': {
        const weekStart = new Date(referenceDate);
        weekStart.setDate(weekStart.getDate() - 7);
        return {
          startDate: weekStart,
          endDate: referenceDate,
        };
      }
      default:
        return {
          startDate: startOfDay(referenceDate),
          endDate: endOfDay(referenceDate),
        };
    }
  }

  static calculateNextDueDate(lastDate: Date, frequency: string): Date {
    const nextDue = new Date(lastDate);

    switch (this.normalizeFrequency(frequency)) {
      case 'DAILY':
        nextDue.setDate(nextDue.getDate() + 1);
        break;
      case 'TWICE_DAILY':
        nextDue.setHours(nextDue.getHours() + 12);
        break;
      case 'WEEKLY':
        nextDue.setDate(nextDue.getDate() + 7);
        break;
      case 'MONTHLY':
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
    }
    
    return nextDue;
  }

  static calculateDaysBetween(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static calculateExpectedOccurrences(frequency: string, startDate: Date, endDate: Date): number {
    const diffDays = this.calculateDaysBetween(startDate, endDate);

    switch (this.normalizeFrequency(frequency)) {
      case 'DAILY':
        return diffDays;
      case 'TWICE_DAILY':
        return diffDays * 2;
      case 'WEEKLY':
        return Math.ceil(diffDays / 7);
      case 'MONTHLY':
        return Math.ceil(diffDays / 30);
      default:
        return 0;
    }
  }
}
