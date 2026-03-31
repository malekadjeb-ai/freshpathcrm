export interface CalendarJob {
  id: string;
  status: string;
  scheduledAt: string;
  total: number;
  customer: { name: string };
  services: { serviceItem: { name: string } | null; customName?: string | null }[];
  vehicle: { make: string; model: string; year: number } | null;
}

export const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);

export function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}
