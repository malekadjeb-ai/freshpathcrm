"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import type { LeadDetail } from "@/components/leads/lead-types";
import { LeadDetailHeader } from "@/components/leads/lead-detail-header";
import { LeadOverviewTab } from "@/components/leads/lead-overview-tab";
import { LeadEstimatesTab } from "@/components/leads/lead-estimates-tab";
import { LeadActivityTab } from "@/components/leads/lead-activity-tab";
import { LogActivityDialog } from "@/components/leads/log-activity-dialog";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState("overview");
  const [activityOpen, setActivityOpen] = useState(false);

  const { data: lead, isLoading, isError, refetch } = useQuery<LeadDetail>({
    queryKey: ["lead", params.id],
    queryFn: () => fetchJson(`/api/leads/${params.id}`),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError || !lead || "error" in (lead as object)) {
    return <ErrorState message="Failed to load lead." onRetry={refetch} />;
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto">
      <LeadDetailHeader lead={lead} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as string || "overview")}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="estimates">Estimates ({lead.estimates?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity">Activity ({lead.activities?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <LeadOverviewTab lead={lead} />
        </TabsContent>

        <TabsContent value="estimates" className="mt-4">
          <LeadEstimatesTab lead={lead} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <LeadActivityTab lead={lead} onLogActivity={() => setActivityOpen(true)} />
        </TabsContent>
      </Tabs>

      <LogActivityDialog
        leadId={params.id}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </div>
  );
}
