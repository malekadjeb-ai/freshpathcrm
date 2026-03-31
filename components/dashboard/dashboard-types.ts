export interface DashboardData {
  kpis: {
    todayRevenue: number;
    monthRevenue: number;
    totalJobs: number;
    avgTicket: number;
    weekJobs: number;
    outstandingTotal: number;
    pendingEstimates: number;
    pendingEstimateTotal: number;
    monthExpenses: number;
    todayExpenses: number;
    monthProfit: number;
  };
  activity: {
    recentJobs: { id: string; status: string; total: number; updatedAt: string; customer: { name: string } }[];
    upcomingJobs: {
      id: string;
      scheduledAt: string;
      total: number;
      customer: { name: string };
      services: { serviceItem: { name: string } | null; customName?: string | null }[];
      vehicle: { make: string; model: string; year: number } | null;
    }[];
    recentPayments: { id: string; amount: number; method: string; createdAt: string; invoice: { job: { customer: { name: string } } } }[];
    recentCommunications: { id: string; type: string; direction: string; status: string; summary: string | null; createdAt: string; customer: { name: string } }[];
    needsFollowUp: { id: string; name: string; phone: string | null; lastVisit: string | null }[];
  };
  tasksDue?: {
    dueToday: number;
    overdue: number;
    tasks: { id: string; title: string; dueDate: string | null; priority: string }[];
  };
  reviews?: { pending: number; completed: number; recent: unknown[] };
}

export type LeadItem = {
  id: string;
  name: string;
  status: string;
  source: string;
  phone: string | null;
  createdAt: string;
};
