export interface Communication {
  id: string;
  customerId: string;
  type: string;
  direction: string;
  status: string;
  summary: string | null;
  body: string | null;
  duration: number | null;
  outcome: string | null;
  source: string | null;
  jobId: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null; email: string | null };
  job: { id: string; status: string; scheduledAt: string | null } | null;
}

export interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface JobOption {
  id: string;
  status: string;
  scheduledAt: string | null;
  customer: { name: string };
}
