export interface CustomerListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  neighborhood: string | null;
  tags: { id: string; name: string; color: string }[];
  totalSpent: number;
  jobCount: number;
  lastServiceDate: string | null;
}

export type CustomerSortKey = "name" | "totalSpent" | "jobCount" | "lastServiceDate" | "createdAt";

export interface CustomerDetailData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phoneCarrier: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  neighborhood: string | null;
  tags: { id: string; name: string; color: string }[];
  vehicles: {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string | null;
    licensePlate: string | null;
    vehicleType: string;
  }[];
  jobs: {
    id: string;
    status: string;
    scheduledAt: string | null;
    total: number;
    vehicle: { make: string; model: string; year: number } | null;
    services: { serviceItem: { name: string } | null; customName?: string | null }[];
    invoice: { id: string; invoiceNumber: string } | null;
  }[];
  notes: { id: string; content: string; createdAt: string }[];
  referredBy: { id: string; name: string } | null;
  referrals: { id: string; name: string }[];
  totalSpent: number;
  source: string | null;
  sourceDetail: string | null;
  lifecycleStage: string;
  healthScore: number | null;
  lastContactedAt: string | null;
  lastJobAt: string | null;
  preferredContact: string;
  birthday: string | null;
  gateCode: string | null;
  specialInstructions: string | null;
  isCommercial: boolean;
  companyName: string | null;
  taxId: string | null;
  billingEmail: string | null;
  billingContact: string | null;
  paymentTerms: string | null;
  fleetSize: number | null;
  fleetDiscount: number | null;
  contractNotes: string | null;
}

export interface CustomerCommunication {
  id: string;
  type: string;
  direction: string;
  status: string;
  summary: string | null;
  duration: number | null;
  createdAt: string;
  job: { id: string; status: string } | null;
}

export interface ActivityItem {
  id: string;
  type: string;
  direction: string | null;
  summary: string;
  followUpDate: string | null;
  followUpDone: boolean;
  createdAt: string;
}
