import { addDays, addWeeks, addMonths, nextDay } from "date-fns";

const DAY_MAP: Record<number, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
};

export function computeNextRunDate(
  frequency: string,
  dayOfWeek: number | null,
  fromDate: Date
): Date {
  const base = new Date(fromDate);

  // If dayOfWeek is specified, find the next occurrence of that day
  if (dayOfWeek !== null && dayOfWeek in DAY_MAP) {
    const target = DAY_MAP[dayOfWeek];
    const next = nextDay(base, target);

    switch (frequency) {
      case "weekly":
        return next;
      case "biweekly":
        return next > addDays(base, 7) ? next : addWeeks(next, 1);
      case "monthly":
        return addMonths(base, 1);
      case "quarterly":
        return addMonths(base, 3);
      default:
        return next;
    }
  }

  // No specific day — just advance by the interval
  switch (frequency) {
    case "weekly":
      return addWeeks(base, 1);
    case "biweekly":
      return addWeeks(base, 2);
    case "monthly":
      return addMonths(base, 1);
    case "quarterly":
      return addMonths(base, 3);
    default:
      return addWeeks(base, 1);
  }
}
