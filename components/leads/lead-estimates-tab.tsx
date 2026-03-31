import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { LeadDetail } from "./lead-types";
import { EST_STATUS_COLORS } from "./lead-types";

interface LeadEstimatesTabProps {
  lead: LeadDetail;
}

export function LeadEstimatesTab({ lead }: LeadEstimatesTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm text-slate-700">Estimates</h3>
        <Link href={`/estimates/new?leadId=${lead.id}`}>
          <Button size="sm" variant="outline" className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Create Estimate
          </Button>
        </Link>
      </div>
      {(!lead.estimates || lead.estimates.length === 0) ? (
        <Card className="p-8 text-center">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No estimates yet</p>
        </Card>
      ) : (
        lead.estimates.map((est) => (
          <Link key={est.id} href={`/estimates/${est.id}`}>
            <Card className="p-4 hover:border-emerald-200 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{est.estimateNumber}</span>
                    <Badge className={cn("text-[10px]", EST_STATUS_COLORS[est.status])}>{est.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(est.createdAt)}</p>
                </div>
                <span className="font-semibold text-emerald-600">{formatCurrency(est.total)}</span>
              </div>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
