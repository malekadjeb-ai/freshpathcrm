export const LEAD_SOURCES = [
  "Google",
  "Instagram",
  "Facebook",
  "TikTok",
  "Nextdoor",
  "Referral",
  "Website",
  "Walk-in",
  "Yelp",
  "Google Ads",
  "Door Hanger",
  "HOA",
  "Fleet",
  "Other",
] as const;

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Quoted",
  "Won",
  "Lost",
  "Stale",
] as const;

export const LEAD_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export const ESTIMATE_STATUSES = ["Draft", "Sent", "Viewed", "Accepted", "Declined", "Expired"] as const;

export const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"] as const;

export const ACTIVITY_TYPES = ["CALL", "TEXT", "EMAIL", "IN_PERSON", "NOTE", "VOICEMAIL"] as const;

export const ACTIVITY_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;

export const USER_ROLES = ["ADMIN", "OWNER", "MANAGER", "EMPLOYEE", "USER"] as const;

export const SUBSCRIPTION_PLANS = ["FREE", "PRO", "GROWTH", "ENTERPRISE"] as const;

export const TENANT_STATUSES = ["ACTIVE", "PAUSED", "CANCELLED", "TRIAL"] as const;
