export interface AnalyticsData {
  revenue: {
    byWeek: { week: string; revenue: number }[];
    byService: { name: string; revenue: number }[];
    byLocation: { location: string; revenue: number }[];
    total: number;
    commercial: number;
    residential: number;
  };
  expenses: {
    total: number;
    profit: number;
    profitMargin: number;
    byCategory: { category: string; amount: number }[];
    profitByWeek: { week: string; revenue: number; expenses: number; profit: number }[];
  };
  performance: {
    avgTicket: number;
    totalJobs: number;
    addOnAttachRate: number;
    addOnRevenue: number;
  };
  customers: {
    newVsReturning: { name: string; value: number }[];
    ltvDistribution: { range: string; count: number }[];
    churnedCount: number;
    churnedCustomers: {
      id: string;
      name: string;
      lastService: string | null;
      totalSpent: number;
    }[];
  };
  route: {
    totalMileage: number;
    totalTravelTime: number;
    avgMileagePerJob: number;
    mileageCost: number;
    jobsTracked: number;
  };
  leads: {
    total: number;
    converted: number;
    conversionRate: number;
    byStatus: { status: string; count: number }[];
    bySource: { source: string; count: number }[];
  };
  estimates: {
    total: number;
    converted: number;
    conversionRate: number;
    totalValue: number;
    byStatus: { status: string; count: number }[];
  };
  scheduling: {
    byDayOfWeek: { day: string; jobs: number; revenue: number }[];
    byHour: { hour: number; jobs: number; revenue: number }[];
  };
  campaigns: {
    total: number;
    sent: number;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalConverted: number;
  };
}
