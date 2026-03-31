"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import type { AnalyticsData } from "./analytics-types";

interface MarketingTabProps {
  campaigns: AnalyticsData["campaigns"];
}

export function MarketingTab({ campaigns }: MarketingTabProps) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Megaphone className="w-3.5 h-3.5" />
              Campaigns Sent
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{campaigns.sent}</p>
            <p className="text-xs text-slate-400 mt-0.5">{campaigns.total} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Messages Sent</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{campaigns.totalSent.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Open Rate</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {campaigns.totalSent > 0 ? ((campaigns.totalOpened / campaigns.totalSent) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{campaigns.totalOpened.toLocaleString()} opened</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Conversions</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{campaigns.totalConverted}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {campaigns.totalSent > 0 ? ((campaigns.totalConverted / campaigns.totalSent) * 100).toFixed(1) : 0}% rate
            </p>
          </CardContent>
        </Card>
      </div>

      {campaigns.totalSent > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Campaign Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Sent", value: campaigns.totalSent, color: "bg-slate-400" },
                { label: "Opened", value: campaigns.totalOpened, color: "bg-blue-500" },
                { label: "Clicked", value: campaigns.totalClicked, color: "bg-amber-500" },
                { label: "Converted", value: campaigns.totalConverted, color: "bg-emerald-500" },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-20">{step.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full ${step.color} rounded-full flex items-center justify-end pr-2`}
                      style={{
                        width: `${campaigns.totalSent > 0 ? Math.max((step.value / campaigns.totalSent) * 100, 3) : 0}%`,
                      }}
                    >
                      <span className="text-xs font-medium text-white">{step.value.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 w-14 text-right">
                    {campaigns.totalSent > 0 ? ((step.value / campaigns.totalSent) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
