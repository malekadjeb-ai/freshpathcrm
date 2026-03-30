"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Droplets,
  Sparkles,
  Wrench,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useState } from "react";

interface TimelineEntry {
  id: string;
  date: string;
  type: "maintenance" | "correction" | "protection" | "detail";
  services: string[];
  notes: string | null;
  photos: string[];
  total: number;
}

interface ProtectionStatus {
  ceramicCoating: {
    applied: string | null;
    expiresApprox: string | null;
    monthsRemaining: number | null;
  } | null;
  lastWash: { date: string; daysAgo: number } | null;
  lastInterior: { date: string; daysAgo: number } | null;
  lastPaintCorrection: { date: string; grade: string | null } | null;
}

interface Recommendation {
  service: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  daysSinceLast: number | null;
}

interface TimelineData {
  vehicle: {
    id: string;
    year: number;
    make: string;
    model: string;
    color: string | null;
    customerName: string;
  };
  timeline: TimelineEntry[];
  protectionStatus: ProtectionStatus;
  recommendations: Recommendation[];
}

const typeConfig = {
  protection: { icon: Shield, color: "text-amber-500", bg: "bg-amber-100", border: "border-amber-300", label: "Protection" },
  correction: { icon: Sparkles, color: "text-blue-500", bg: "bg-blue-100", border: "border-blue-300", label: "Correction" },
  maintenance: { icon: Droplets, color: "text-emerald-500", bg: "bg-emerald-100", border: "border-emerald-300", label: "Maintenance" },
  detail: { icon: Wrench, color: "text-purple-500", bg: "bg-purple-100", border: "border-purple-300", label: "Detail" },
};

export function VehicleTimeline({ vehicleId }: { vehicleId: string }) {
  const [expanded, setExpanded] = useState(true);

  const { data, isLoading } = useQuery<TimelineData>({
    queryKey: ["vehicle-timeline", vehicleId],
    queryFn: () => fetch(`/api/vehicles/${vehicleId}/timeline`).then((r) => r.json()),
    enabled: !!vehicleId,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-5 bg-slate-200 rounded w-32" />
        <div className="h-20 bg-slate-100 rounded-xl" />
        <div className="h-20 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!data || data.timeline.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        No service history for this vehicle yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Protection Status */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          Protection Status
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {data.protectionStatus.ceramicCoating ? (
            <div className="bg-white rounded-lg p-2.5 border border-slate-200">
              <div className="text-xs text-slate-500">Ceramic Coating</div>
              <div className="text-sm font-medium text-slate-900">
                {data.protectionStatus.ceramicCoating.monthsRemaining} mo remaining
              </div>
              <div className="text-[10px] text-slate-400">
                {data.protectionStatus.ceramicCoating.applied && `Applied ${formatDate(data.protectionStatus.ceramicCoating.applied)}`}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-2.5 border border-slate-200">
              <div className="text-xs text-slate-500">Ceramic Coating</div>
              <div className="text-sm text-slate-400">Not applied</div>
            </div>
          )}
          <div className="bg-white rounded-lg p-2.5 border border-slate-200">
            <div className="text-xs text-slate-500">Last Wash</div>
            <div className="text-sm font-medium text-slate-900">
              {data.protectionStatus.lastWash
                ? `${data.protectionStatus.lastWash.daysAgo} days ago`
                : "No record"}
            </div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-slate-200">
            <div className="text-xs text-slate-500">Last Interior</div>
            <div className="text-sm font-medium text-slate-900">
              {data.protectionStatus.lastInterior
                ? `${data.protectionStatus.lastInterior.daysAgo} days ago`
                : "No record"}
            </div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-slate-200">
            <div className="text-xs text-slate-500">Paint Correction</div>
            <div className="text-sm font-medium text-slate-900">
              {data.protectionStatus.lastPaintCorrection
                ? data.protectionStatus.lastPaintCorrection.grade || "Done"
                : "Never"}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="space-y-2">
          {data.recommendations.map((rec, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 flex items-start gap-3 ${
                rec.urgency === "high"
                  ? "bg-red-50 border-red-200"
                  : rec.urgency === "medium"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  rec.urgency === "high" ? "text-red-500" : rec.urgency === "medium" ? "text-amber-500" : "text-blue-500"
                }`}
              />
              <div>
                <div className="text-sm font-medium text-slate-900">{rec.service}</div>
                <div className="text-xs text-slate-600">{rec.reason}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3"
        >
          <Clock className="w-4 h-4 text-slate-400" />
          Service Timeline ({data.timeline.length})
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200" />

            <div className="space-y-4">
              {data.timeline.map((entry) => {
                const config = typeConfig[entry.type];
                const Icon = config.icon;
                return (
                  <div key={entry.id} className="relative">
                    {/* Dot */}
                    <div className={`absolute -left-[14px] top-1.5 w-5 h-5 rounded-full ${config.bg} border-2 ${config.border} flex items-center justify-center`}>
                      <Icon className={`w-2.5 h-2.5 ${config.color}`} />
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">{formatDate(entry.date)}</span>
                        <Badge variant="secondary" className={`text-[10px] ${config.bg} ${config.color} border-0`}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium text-slate-900">
                        {entry.services.join(", ")}
                      </div>
                      {entry.notes && (
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">{entry.notes}</div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">{formatCurrency(entry.total)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
