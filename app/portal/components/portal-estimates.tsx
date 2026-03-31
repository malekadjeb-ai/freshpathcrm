"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Estimate } from "../hooks/use-portal";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-100 text-blue-700",
  Viewed: "bg-blue-100 text-blue-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Declined: "bg-red-100 text-red-700",
  Expired: "bg-slate-100 text-slate-500",
};

interface PortalEstimatesProps {
  estimates: Estimate[];
  declineEstimateId: string | null;
  declineReason: string;
  isPending: boolean;
  onDeclineStart: (id: string) => void;
  onDeclineCancel: () => void;
  onDeclineReasonChange: (reason: string) => void;
  onApprove: (id: string) => void;
  onDeclineConfirm: (id: string) => void;
}

export function PortalEstimates({
  estimates,
  declineEstimateId,
  declineReason,
  isPending,
  onDeclineStart,
  onDeclineCancel,
  onDeclineReasonChange,
  onApprove,
  onDeclineConfirm,
}: PortalEstimatesProps) {
  return (
    <>
      <h2 className="text-base font-bold text-slate-900">My Estimates</h2>
      {estimates.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No estimates yet.</div>
      ) : (
        <div className="space-y-3">
          {estimates.map((est) => {
            const isPendingEst = ["Sent", "Viewed"].includes(est.status);
            return (
              <div key={est.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium text-slate-900">Estimate #{est.estimateNumber}</div>
                    <div className="text-xs text-slate-500">{formatDate(est.createdAt)}</div>
                    {est.vehicle && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {est.vehicle.year} {est.vehicle.make} {est.vehicle.model}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-slate-900">{formatCurrency(est.total)}</div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[est.status] || "bg-slate-100 text-slate-600"}`}>
                      {est.status}
                    </span>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-2 space-y-1">
                  {est.lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.name}{item.quantity > 1 && ` x${item.quantity}`}</span>
                      <span className="text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                {isPendingEst && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {declineEstimateId === est.id ? (
                      <div className="space-y-2">
                        <Textarea placeholder="Reason for declining (optional)" value={declineReason} onChange={(e) => onDeclineReasonChange(e.target.value)} rows={2} />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={onDeclineCancel}>Cancel</Button>
                          <Button size="sm" variant="destructive" onClick={() => onDeclineConfirm(est.id)} disabled={isPending}>
                            <XCircle className="w-4 h-4 mr-1" /> Confirm Decline
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600" onClick={() => onApprove(est.id)} disabled={isPending}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => onDeclineStart(est.id)}>
                          <XCircle className="w-4 h-4 mr-1" /> Decline
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
