"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface FleetStatsProps {
  accountCount: number;
  totalVehicles: number;
  activeContracts: number;
  totalRevenue: number;
}

export function FleetStats({ accountCount, totalVehicles, activeContracts, totalRevenue }: FleetStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-slate-900">{accountCount}</div>
          <div className="text-xs text-slate-500 mt-1">Fleet Accounts</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-blue-600">{totalVehicles}</div>
          <div className="text-xs text-slate-500 mt-1">Total Fleet Vehicles</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-emerald-600">{activeContracts}</div>
          <div className="text-xs text-slate-500 mt-1">Active Contracts</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-slate-500 mt-1">Fleet Revenue</div>
        </CardContent>
      </Card>
    </div>
  );
}
