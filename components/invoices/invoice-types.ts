export interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  job: {
    id: string;
    scheduledAt: string | null;
    notes: string | null;
    customer: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      zip: string | null;
    };
    vehicle: { make: string; model: string; year: number; color: string | null } | null;
    services: { price: number; quantity: number; serviceItem: { name: string; category: string } | null; customName?: string | null }[];
  };
  payments: { id: string; amount: number; method: string; paymentDate: string; notes: string | null }[];
}

export interface BusinessSettings {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  invoiceFooter: string;
}
