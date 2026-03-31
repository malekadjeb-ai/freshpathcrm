export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  subject: string | null;
  body: string;
  targetCriteria: string;
  audienceCount: number;
  sentCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  convertedCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AudiencePreview {
  count: number;
  sample: { id: string; name: string; phone: string | null; email: string | null }[];
}

export const statusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Scheduled: "bg-blue-100 text-blue-700",
  Sending: "bg-yellow-100 text-yellow-700",
  Sent: "bg-emerald-100 text-emerald-700",
  Paused: "bg-orange-100 text-orange-700",
  Cancelled: "bg-red-100 text-red-700",
};
