export interface FieldJob {
  id: string;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  total: number;
  address: string | null;
  city: string | null;
  notes: string | null;
  estimatedDuration: number | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
  vehicle: {
    year: number;
    make: string;
    model: string;
    color: string | null;
    vehicleType: string;
  } | null;
  services: {
    serviceItem: { name: string } | null;
    customName?: string | null;
    price: number;
  }[];
}

export type FieldTab = "today" | "route" | "notifications";
