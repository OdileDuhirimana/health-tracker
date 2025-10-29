import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

export class DateUtils {
  static getDateRange(frequency: string, referenceDate: Date): { startDate: Date; endDate: Date } {
    switch (frequency.toUpperCase()) {
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
      case 'WEEKLY':
        const weekStart = new Date(referenceDate);
        weekStart.setDate(weekStart.getDate() - 7);
        return {
          startDate: weekStart,
          endDate: referenceDate,
        };
      default:
        return {
          startDate: startOfDay(referenceDate),
          endDate: endOfDay(referenceDate),
        };
    }
  }

  static calculateNextDueDate(lastDate: Date, frequency: string): Date {
    const nextDue = new Date(lastDate);
    
    switch (frequency.toUpperCase()) {
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

    switch (frequency.toUpperCase()) {
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
