export interface JobDetail {
  id: string;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  address: string | null;
  city: string | null;
  location: string;
  subtotal: number;
  discount: number;
  discountType: string;
  total: number;
  notes: string | null;
  internalNotes: string | null;
  photos: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    tags: { id: string; name: string; color: string }[];
  };
  vehicle: { id: string; make: string; model: string; year: number; color: string | null; vehicleType: string } | null;
  services: { id: string; customName: string | null; price: number; quantity: number; serviceItem: { id: string | null; name: string | null; category: string | null } }[];
  invoice: { id: string; invoiceNumber: string; status: string; total: number } | null;
  statusHistory: { id: string; fromStatus: string | null; toStatus: string; createdAt: string; note: string | null }[];
  travelTime: number | null;
  mileage: number | null;
  customerSignature: string | null;
  showInGallery: boolean;
  assignedToId: string | null;
  assignedStaff: { id: string; name: string; color: string; role: string; phone: string | null } | null;
}
