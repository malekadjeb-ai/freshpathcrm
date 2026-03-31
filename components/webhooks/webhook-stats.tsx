"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { WebhookEndpoint } from "./types";

interface WebhookStatsProps {
  endpoints: WebhookEndpoint[];
}

export function WebhookStats({ endpoints }: WebhookStatsProps) {
  const activeCount = endpoints.filter((e) => e.isActive).length;
  const totalDeliveries = endpoints.reduce((s, e) => s + e.logCount, 0);
  const failingCount = endpoints.filter((e) => e.failCount > 0).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-slate-900">{endpoints.length}</div>
          <div className="text-xs text-slate-500 mt-1">Endpoints</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          <div className="text-xs text-slate-500 mt-1">Active</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-blue-600">{totalDeliveries}</div>
          <div className="text-xs text-slate-500 mt-1">Total Deliveries</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className={`text-2xl font-bold ${failingCount > 0 ? "text-red-600" : "text-slate-900"}`}>
            {failingCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">Failing</div>
        </CardContent>
      </Card>
    </div>
  );
}
