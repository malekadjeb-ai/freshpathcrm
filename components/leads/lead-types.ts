export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  sourceDetail: string | null;
  status: string;
  lostReason: string | null;
  lostNotes: string | null;
  notes: string | null;
  vehicleInfo: string | null;
  address: string | null;
  city: string | null;
  priority: string;
  customerId: string | null;
  customer: { id: string; name: string } | null;
  createdAt: string;
  contactedAt: string | null;
  convertedAt: string | null;
  lostAt: string | null;
}

export const SOURCES = [
  "Google", "Google LSA", "Google Voice", "Google Ads", "Instagram", "Facebook",
  "Referral", "Yelp", "Nextdoor", "Walk-in", "Flyer", "Website", "TikTok",
  "Door Hanger", "HOA", "Fleet", "Other",
] as const;

export interface LeadDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  sourceDetail: string | null;
  status: string;
  notes: string | null;
  vehicleInfo: string | null;
  address: string | null;
  city: string | null;
  priority: string;
  customerId: string | null;
  customer: { id: string; name: string } | null;
  estimates: {
    id: string;
    estimateNumber: string;
    status: string;
    total: number;
    createdAt: string;
    lineItems: { id: string; service: { name: string } | null; description: string; unitPrice: number; quantity: number }[];
  }[];
  activities: {
    id: string;
    type: string;
    direction: string | null;
    summary: string;
    followUpDate: string | null;
    followUpDone: boolean;
    createdAt: string;
  }[];
  createdAt: string;
  contactedAt: string | null;
  convertedAt: string | null;
}

export const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-amber-100 text-amber-700",
  Quoted: "bg-purple-100 text-purple-700",
  Booked: "bg-emerald-100 text-emerald-700",
  Won: "bg-emerald-100 text-emerald-700",
  Lost: "bg-red-100 text-red-700",
};

export const EST_STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-blue-100 text-blue-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Declined: "bg-red-100 text-red-700",
  Expired: "bg-amber-100 text-amber-700",
};
