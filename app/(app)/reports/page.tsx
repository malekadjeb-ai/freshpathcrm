"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileBarChart,
  Plus,
  Trash2,
  Calendar,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDateTime, fetchJson } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";

interface ScheduledReport {
  id: string;
  name: string;
  type: string;
  frequency: string;
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

const REPORT_TYPES: Record<string, string> = {
  WEEKLY_SUMMARY: "Weekly Summary",
  MONTHLY_REVENUE: "Monthly Revenue",
  LEAD_PERFORMANCE: "Lead Performance",
};

const REPORT_TYPE_DESCRIPTIONS: Record<string, string> = {
  WEEKLY_SUMMARY: "Jobs completed, revenue, new leads, conversion rate",
  MONTHLY_REVENUE: "Revenue breakdown by service, top customers, growth %",
  LEAD_PERFORMANCE: "Leads by source, conversion rates, avg response time",
};

const FREQUENCY_OPTIONS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

const TYPE_COLORS: Record<string, string> = {
  WEEKLY_SUMMARY: "bg-emerald-100 text-emerald-800",
  MONTHLY_REVENUE: "bg-blue-100 text-blue-800",
  LEAD_PERFORMANCE: "bg-purple-100 text-purple-800",
};

const FREQUENCY_COLORS: Record<string, string> = {
  DAILY: "bg-amber-100 text-amber-800",
  WEEKLY: "bg-slate-100 text-slate-800",
  MONTHLY: "bg-cyan-100 text-cyan-800",
};

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newFrequency, setNewFrequency] = useState("");

  const { data: reports = [], isLoading, isError } = useQuery<ScheduledReport[]>({
    queryKey: ["scheduled-reports"],
    queryFn: () => fetchJson<ScheduledReport[]>("/api/reports/scheduled"),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; type: string; frequency: string }) =>
      fetchJson<ScheduledReport>("/api/reports/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success("Report created successfully");
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create report");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetchJson<ScheduledReport>(`/api/reports/scheduled/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success(variables.isActive ? "Report activated" : "Report paused");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update report");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/reports/scheduled/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success("Report deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete report");
    },
  });

  function resetForm() {
    setDialogOpen(false);
    setNewName("");
    setNewType("");
    setNewFrequency("");
  }

  function handleCreate() {
    if (!newName.trim() || !newType || !newFrequency) {
      toast.error("Please fill in all fields");
      return;
    }
    createMutation.mutate({
      name: newName.trim(),
      type: newType,
      frequency: newFrequency,
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-emerald-600" />
            Scheduled Reports
          </h1>
          <p className="text-slate-500 mt-1">
            Automate recurring reports delivered to your inbox
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="animate-pulse flex items-center gap-4">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded w-20" />
                  <div className="h-5 bg-slate-200 rounded w-16" />
                  <div className="ml-auto h-5 bg-slate-200 rounded w-10" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600 font-medium">Failed to load reports</p>
            <p className="text-slate-500 text-sm mt-1">Please try refreshing the page</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && reports.length === 0 && (
        <EmptyState
          icon={FileBarChart}
          title="No scheduled reports"
          description="Create your first scheduled report to receive automated insights."
          actionLabel="Create Report"
          onAction={() => setDialogOpen(true)}
        />
      )}

      {/* Reports List */}
      {!isLoading && !isError && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {report.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={TYPE_COLORS[report.type] || "bg-slate-100 text-slate-800"}
                      >
                        {REPORT_TYPES[report.type] || report.type}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={FREQUENCY_COLORS[report.frequency] || "bg-slate-100 text-slate-800"}
                      >
                        {FREQUENCY_OPTIONS[report.frequency] || report.frequency}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {REPORT_TYPE_DESCRIPTIONS[report.type] || "Custom report"}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Created {formatDateTime(report.createdAt)}
                      </span>
                      {report.lastSentAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last sent {formatDateTime(report.lastSentAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {report.isActive ? "Active" : "Paused"}
                    </span>
                    <Switch
                      checked={report.isActive}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: report.id, isActive: checked })
                      }
                    />
                  </div>

                  {/* Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Report</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{report.name}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(report.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Scheduled Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                placeholder="e.g. Weekly Team Summary"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY_SUMMARY">
                    Weekly Summary
                  </SelectItem>
                  <SelectItem value="MONTHLY_REVENUE">
                    Monthly Revenue
                  </SelectItem>
                  <SelectItem value="LEAD_PERFORMANCE">
                    Lead Performance
                  </SelectItem>
                </SelectContent>
              </Select>
              {newType && (
                <p className="text-xs text-slate-500">
                  {REPORT_TYPE_DESCRIPTIONS[newType]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={newFrequency} onValueChange={(v) => setNewFrequency(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending ? "Creating..." : "Create Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
