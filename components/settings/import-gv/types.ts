export interface PreviewRecord {
  phoneNumber: string;
  contactName?: string;
  direction: "inbound" | "outbound" | "missed";
  type: "call" | "text" | "voicemail";
  timestamp: string;
  duration?: number;
  messageBody?: string;
}

export interface ImportStats {
  total: number;
  calls: number;
  texts: number;
  voicemails: number;
  uniqueContacts: number;
  dateRange: { start: string; end: string } | null;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  matched: number;
  customersCreated: number;
  total: number;
}

export type Step = "upload" | "preview" | "importing" | "done";
