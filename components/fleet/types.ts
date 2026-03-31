export interface FleetCustomer {
  id: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  fleetSize: number | null;
  fleetDiscount: number | null;
  paymentTerms: string | null;
  vehicles: { id: string }[];
  totalSpent: number;
  jobCount: number;
}

export interface FleetContract {
  id: string;
  customerId: string;
  customer: { id: string; name: string; companyName: string | null };
  name: string;
  frequency: string;
  pricePerVehicle: number | null;
  flatRate: number | null;
  vehicleCount: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface ContractFormData {
  customerId: string;
  name: string;
  frequency: string;
  pricePerVehicle: string;
  flatRate: string;
  vehicleCount: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

export const TERMS_LABELS: Record<string, string> = {
  due_on_receipt: "Due on Receipt",
  net_15: "Net 15",
  net_30: "Net 30",
  net_60: "Net 60",
};
