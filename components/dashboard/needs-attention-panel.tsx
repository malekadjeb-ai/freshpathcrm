"use client";

import Link from "next/link";
import { UseMutationResult } from "@tanstack/react-query";
import {
  AlertCircle, ArrowRight, CheckCircle2, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface ActionItem {
  label: string;
  detail: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface FollowUpItem {
  id: string;
  type: string;
  summary: string;
  followUpDate: string;
  followUpDone: boolean;
  customer: { id: string; name: string; phone: string | null };
}

interface TaskDueItem {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
}

export function NeedsAttentionPanel({
  actionItems,
  followUps,
  tasks,
  markDoneMutation,
  snoozeMutation,
  markTaskDoneMutation,
}: {
  actionItems: ActionItem[];
  followUps: FollowUpItem[];
  tasks: TaskDueItem[];
  markDoneMutation: UseMutationResult<unknown, Error, string>;
  snoozeMutation: UseMutationResult<unknown, Error, { id: string; days: number }>;
  markTaskDoneMutation: UseMutationResult<unknown, Error, string>;
}) {
  const hasContent = actionItems.length > 0 || followUps.length > 0 || tasks.length > 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          Needs Attention
        </h2>
      </div>
      <div className="p-5">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
            <p className="text-sm font-medium text-slate-500">All caught up!</p>
            <p className="text-xs text-slate-400 mt-0.5">Nothing needs your attention right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {actionItems.map((item, i) => (
              <Link key={i} href={item.href}>
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors">
                  <div className={cn("p-1.5 rounded-md", item.color)}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.detail}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </Link>
            ))}

            {followUps.slice(0, 4).map((fu) => {
              const isOverdue = new Date(fu.followUpDate) < new Date(new Date().toDateString());
              return (
                <div
                  key={fu.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5",
                    isOverdue ? "bg-red-50/50" : "hover:bg-slate-50"
                  )}
                >
                  <div className={cn("p-1.5 rounded-md", isOverdue ? "bg-red-100 text-red-500" : "bg-amber-50 text-amber-500")}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/customers/${fu.customer.id}`}
                      className="text-sm font-medium text-slate-800 hover:text-emerald-600"
                    >
                      {fu.customer.name}
                    </Link>
                    <p className="text-xs text-slate-400 truncate">{fu.summary}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-emerald-600"
                      onClick={() => markDoneMutation.mutate(fu.id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                    {[1, 3].map((d) => (
                      <Button
                        key={d}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-1.5 text-[10px] text-slate-400"
                        onClick={() => snoozeMutation.mutate({ id: fu.id, days: d })}
                      >
                        +{d}d
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}

            {tasks.slice(0, 3).map((task) => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString());
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5",
                    isOverdue ? "bg-red-50/50" : "hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-md",
                    task.priority === "high" ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-400"
                  )}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-xs text-slate-400">
                        Due {format(new Date(task.dueDate), "MMM d")}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-emerald-600 shrink-0"
                    onClick={() => markTaskDoneMutation.mutate(task.id)}
                    disabled={markTaskDoneMutation.isPending}
                  >
                    Done
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
