"use client";

import Link from "next/link";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Phone, Clock, ArrowRight, AlertTriangle, GripVertical, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_STYLES } from "@/lib/ui-constants";
import type { Lead } from "./lead-types";

interface DroppableColumnProps {
  id: string;
  label: string;
  count: number;
  children: React.ReactNode;
}

export function DroppableColumn({ id, label, count, children }: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-slate-50 rounded-xl p-3 transition-colors",
        isOver && "bg-emerald-50 ring-2 ring-emerald-200"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-slate-700">{label}</h3>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

interface LeadCardContentProps {
  lead: Lead;
}

export function LeadCardContent({ lead }: LeadCardContentProps) {
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <span className="font-medium text-sm text-slate-900">{lead.name}</span>
        <Badge className={cn("text-xs", PRIORITY_STYLES[lead.priority])}>
          {lead.priority}
        </Badge>
      </div>
      {lead.vehicleInfo && (
        <p className="text-xs text-slate-500 mb-1">{lead.vehicleInfo}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
        <span className={cn(
          "px-1.5 py-0.5 rounded",
          lead.source === "Google LSA" ? "bg-green-100 text-green-700 font-medium" : "bg-slate-100 text-slate-600"
        )}>
          {lead.source}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {daysSinceCreated}d ago
        </span>
      </div>
      {lead.phone && (
        <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
          <Phone className="w-3 h-3" /> {lead.phone}
        </p>
      )}
      {lead.notes && (
        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{lead.notes}</p>
      )}
    </div>
  );
}

interface DraggableLeadCardProps {
  lead: Lead;
  onStatusChange: (status: string) => void;
  onConvert: () => void;
  onMarkLost: () => void;
}

export function DraggableLeadCard({ lead, onStatusChange, onConvert, onMarkLost }: DraggableLeadCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div ref={setNodeRef} className={cn(isDragging && "opacity-40")}>
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-1">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <LeadCardContent lead={lead} />
          </div>
        </div>

        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
          {lead.status === "New" && (
            <Button variant="ghost" size="xs" onClick={() => onStatusChange("Contacted")} className="text-xs">
              Mark Contacted
            </Button>
          )}
          {lead.status === "Contacted" && (
            <Button variant="ghost" size="xs" onClick={() => onStatusChange("Quoted")} className="text-xs">
              Mark Quoted
            </Button>
          )}
          {(lead.status === "Quoted" || lead.status === "Contacted") && (
            <Button variant="ghost" size="xs" onClick={onConvert} className="text-xs text-emerald-600 hover:text-emerald-700">
              <ArrowRight className="w-3 h-3 mr-1" />
              Convert
            </Button>
          )}
          {lead.status !== "Booked" && lead.status !== "Lost" && (
            <Button variant="ghost" size="xs" onClick={onMarkLost} className="text-xs text-red-400 hover:text-red-600 ml-auto">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Lost
            </Button>
          )}
          {lead.status === "Booked" && lead.customer && (
            <Link href={`/customers/${lead.customer.id}`}>
              <Button variant="ghost" size="xs" className="text-xs text-emerald-600">
                <User className="w-3 h-3 mr-1" />
                View Customer
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
