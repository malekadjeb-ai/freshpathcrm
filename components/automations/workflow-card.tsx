"use client";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Trash2, ChevronDown, ArrowRight, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRIGGER_TYPES, ACTION_TYPES } from "@/lib/validations/workflow";
import { format } from "date-fns";
import { ACTION_ICONS, type Workflow } from "./workflow-types";

interface WorkflowCardProps {
  workflow: Workflow;
  onEdit: () => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
  onViewLogs: () => void;
}

export function WorkflowCard({ workflow, onEdit, onToggle, onDelete, onViewLogs }: WorkflowCardProps) {
  const triggerLabel =
    TRIGGER_TYPES.find((t) => t.value === workflow.trigger.type)?.label ||
    workflow.trigger.type;

  return (
    <Card
      className={cn(
        "p-4 transition-all",
        workflow.isActive
          ? "border-emerald-100 bg-white"
          : "border-slate-100 bg-slate-50/50"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={cn(
                "font-semibold text-sm truncate",
                workflow.isActive ? "text-slate-800" : "text-slate-500"
              )}
            >
              {workflow.name}
            </h3>
            <Badge
              variant={workflow.isActive ? "default" : "secondary"}
              className="text-[10px] shrink-0"
            >
              {workflow.isActive ? "Active" : "Paused"}
            </Badge>
          </div>
          {workflow.description && (
            <p className="text-xs text-slate-500 mb-2 line-clamp-1">
              {workflow.description}
            </p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              {triggerLabel}
            </Badge>
            {workflow.actions.map((a, i) => {
              const Icon = ACTION_ICONS[a.type] || Zap;
              const label =
                ACTION_TYPES.find((at) => at.value === a.type)?.label || a.type;
              return (
                <span key={i} className="flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1 font-normal"
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </Badge>
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
            <span>{workflow.runCount} runs</span>
            {workflow.lastRunAt && (
              <span>
                Last: {format(new Date(workflow.lastRunAt), "MMM d, h:mm a")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={workflow.isActive}
            onCheckedChange={onToggle}
          />
          <Button variant="ghost" size="icon" onClick={onViewLogs} title="View logs">
            <History className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-red-400 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
