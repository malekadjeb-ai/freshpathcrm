"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { PRIORITY_STYLES } from "@/lib/ui-constants";
import { isOverdue } from "./use-tasks";
import type { Task } from "./use-tasks";

const TYPE_LABELS: Record<string, string> = {
  general: "General",
  follow_up: "Follow Up",
  call_back: "Call Back",
  send_estimate: "Send Estimate",
  review_request: "Review Request",
  rebook: "Rebook",
};

interface TaskCardProps {
  task: Task;
  borderColor: string;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({ task, borderColor, onToggle, onDelete }: TaskCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border-l-4 bg-white border border-slate-200",
        borderColor,
        task.completed && "opacity-60"
      )}
    >
      <button onClick={() => onToggle(task.id, !task.completed)} className="mt-0.5 shrink-0">
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <Circle className="w-5 h-5 text-slate-500 hover:text-emerald-400 transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium text-slate-900", task.completed && "line-through text-slate-400")}>
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={cn("text-xs", PRIORITY_STYLES[task.priority])}>
              {task.priority}
            </Badge>
            <Badge variant="outline" className="text-xs border-slate-200 text-slate-500">
              {TYPE_LABELS[task.type] || task.type}
            </Badge>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{task.description}</p>
        )}

        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          {task.customer && <span>{task.customer.name}</span>}
          {task.dueDate && (
            <span className={cn(isOverdue(task) && "text-red-400")}>
              {task.dueTime ? `${formatDate(task.dueDate)} ${task.dueTime}` : formatDate(task.dueDate)}
            </span>
          )}
          {task.completedAt && <span className="text-emerald-400">Done {timeAgo(task.completedAt)}</span>}
          <span>{timeAgo(task.createdAt)}</span>
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="text-slate-600 hover:text-red-400 transition-colors shrink-0 mt-0.5"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
