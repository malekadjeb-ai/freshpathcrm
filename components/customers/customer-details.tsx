"use client";

import { useState } from "react";
import { Heart, RefreshCw, Shield, Building2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import type { CustomerDetailData } from "./customer-types";

const LIFECYCLE_LABELS: Record<string, string> = {
  new: "New",
  prospect: "Prospect",
  active: "Active",
  loyal: "Loyal",
  "at-risk": "At Risk",
  inactive: "Inactive",
  lost: "Lost",
};

const LIFECYCLE_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  prospect: "bg-purple-100 text-purple-700",
  active: "bg-emerald-100 text-emerald-700",
  loyal: "bg-amber-100 text-amber-700",
  "at-risk": "bg-red-100 text-red-700",
  inactive: "bg-slate-100 text-slate-600",
  lost: "bg-red-200 text-red-800",
};

function getHealthColor(score: number | null): string {
  if (score === null) return "text-slate-400";
  if (score >= 75) return "text-emerald-500";
  if (score >= 55) return "text-green-500";
  if (score >= 35) return "text-amber-500";
  if (score >= 15) return "text-orange-500";
  return "text-red-500";
}

function getHealthLabel(score: number | null): string {
  if (score === null) return "Not calculated";
  if (score >= 75) return "Excellent";
  if (score >= 55) return "Good";
  if (score >= 35) return "Fair";
  if (score >= 15) return "At Risk";
  return "Lost";
}

interface CustomerSidebarProps {
  customer: CustomerDetailData;
  noteText: string;
  onNoteTextChange: (text: string) => void;
  onAddNote: () => void;
  isAddingNote: boolean;
  onRecalculateHealth: () => Promise<void>;
}

export function CustomerSidebar({
  customer,
  noteText,
  onNoteTextChange,
  onAddNote,
  isAddingNote,
  onRecalculateHealth,
}: CustomerSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Internal Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {customer.notes.length === 0 ? (
              <p className="text-sm text-slate-400">No notes yet</p>
            ) : (
              customer.notes.map((note) => (
                <div key={note.id} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{formatDateTime(note.createdAt)}</p>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Add a note..."
              rows={3}
              value={noteText}
              onChange={(e) => onNoteTextChange(e.target.value)}
              className="resize-none"
            />
            <Button
              size="sm"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={!noteText.trim() || isAddingNote}
              onClick={onAddNote}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Health & Lifecycle */}
      <HealthLifecycleCard customer={customer} onRecalculate={onRecalculateHealth} />

      {/* Quick stats */}
      <QuickStatsCard customer={customer} />

      {/* Special Instructions */}
      {(customer.gateCode || customer.specialInstructions) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Special Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {customer.gateCode && (
              <div>
                <span className="text-slate-500">Gate Code: </span>
                <span className="font-mono font-medium">{customer.gateCode}</span>
              </div>
            )}
            {customer.specialInstructions && (
              <p className="text-slate-600">{customer.specialInstructions}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fleet / Commercial Info */}
      {customer.isCommercial && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Fleet Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {customer.companyName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Company</span>
                <span className="font-medium">{customer.companyName}</span>
              </div>
            )}
            {customer.taxId && (
              <div className="flex justify-between">
                <span className="text-slate-500">Tax ID</span>
                <span className="font-mono text-xs">{customer.taxId}</span>
              </div>
            )}
            {customer.billingContact && (
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Contact</span>
                <span className="font-medium">{customer.billingContact}</span>
              </div>
            )}
            {customer.billingEmail && (
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Email</span>
                <a href={`mailto:${customer.billingEmail}`} className="text-emerald-600 hover:underline text-xs">
                  {customer.billingEmail}
                </a>
              </div>
            )}
            {customer.paymentTerms && (
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Terms</span>
                <span className="font-medium">{customer.paymentTerms}</span>
              </div>
            )}
            {customer.fleetSize != null && (
              <div className="flex justify-between">
                <span className="text-slate-500">Fleet Size</span>
                <span className="font-medium">{customer.fleetSize} vehicles</span>
              </div>
            )}
            {customer.fleetDiscount != null && customer.fleetDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Fleet Discount</span>
                <span className="font-medium text-emerald-600">{customer.fleetDiscount}%</span>
              </div>
            )}
            {customer.contractNotes && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 text-xs">Contract Notes</span>
                <p className="text-slate-600 mt-0.5">{customer.contractNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HealthLifecycleCard({ customer, onRecalculate }: { customer: CustomerDetailData; onRecalculate: () => Promise<void> }) {
  const [recalculating, setRecalculating] = useState(false);
  const stage = customer.lifecycleStage || "new";
  const score = customer.healthScore;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            Health & Lifecycle
          </CardTitle>
          <button
            onClick={async () => {
              setRecalculating(true);
              await onRecalculate();
              setRecalculating(false);
            }}
            disabled={recalculating}
            className="text-slate-400 hover:text-emerald-500 transition-colors"
            title="Recalculate health score"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", recalculating && "animate-spin")} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Lifecycle</span>
          <Badge className={cn("text-xs", LIFECYCLE_COLORS[stage] || "bg-slate-100 text-slate-600")}>
            {LIFECYCLE_LABELS[stage] || stage}
          </Badge>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-slate-500">Health Score</span>
            <span className={cn("text-sm font-semibold", getHealthColor(score))}>
              {score !== null ? `${score}/100` : "—"}
            </span>
          </div>
          {score !== null && (
            <>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    score >= 75 ? "bg-emerald-500" :
                    score >= 55 ? "bg-green-500" :
                    score >= 35 ? "bg-amber-500" :
                    score >= 15 ? "bg-orange-500" : "bg-red-500"
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{getHealthLabel(score)}</p>
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Last Contacted</span>
          <span className="font-medium">
            {customer.lastContactedAt
              ? (() => {
                  const days = differenceInDays(new Date(), new Date(customer.lastContactedAt));
                  return days === 0 ? "Today" : `${days}d ago`;
                })()
              : "Never"}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Last Job</span>
          <span className="font-medium">
            {customer.lastJobAt
              ? (() => {
                  const days = differenceInDays(new Date(), new Date(customer.lastJobAt));
                  return days === 0 ? "Today" : `${days}d ago`;
                })()
              : "Never"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStatsCard({ customer }: { customer: CustomerDetailData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Total Jobs</span>
          <span className="font-medium">{customer.jobs.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Lifetime Value</span>
          <span className="font-semibold text-emerald-600">{formatCurrency(customer.totalSpent)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Avg Ticket</span>
          <span className="font-medium">
            {customer.jobs.length > 0
              ? formatCurrency(customer.totalSpent / customer.jobs.length)
              : "—"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Vehicles</span>
          <span className="font-medium">{customer.vehicles.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Referrals Given</span>
          <span className="font-medium">{customer.referrals.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Last Visit</span>
          {(() => {
            const lastJob = customer.jobs
              .filter((j) => j.scheduledAt)
              .sort((a, b) => new Date(b.scheduledAt!).getTime() - new Date(a.scheduledAt!).getTime())[0];
            if (!lastJob) return <span className="text-slate-400">Never</span>;
            const days = differenceInDays(new Date(), new Date(lastJob.scheduledAt!));
            return (
              <span className={days > 60 ? "text-red-500 font-medium" : "font-medium"}>
                {days === 0 ? "Today" : `${days}d ago`}
              </span>
            );
          })()}
        </div>
        {customer.preferredContact && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Preferred Contact</span>
            <span className="font-medium capitalize">{customer.preferredContact}</span>
          </div>
        )}
        {customer.source && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Source</span>
            <span className="font-medium capitalize">{customer.source}{customer.sourceDetail ? ` (${customer.sourceDetail})` : ""}</span>
          </div>
        )}
        {customer.birthday && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Birthday</span>
            <span className="font-medium">{formatDate(customer.birthday)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
