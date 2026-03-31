"use client";

import { AlertTriangle, CheckCircle2, Circle, Clock } from "lucide-react";
import { TaskCard } from "./task-card";
import type { Task } from "./use-tasks";

const BORDER_COLORS = {
  overdue: "border-l-red-500",
  today: "border-l-amber-500",
  default: "border-l-slate-600",
  completed: "border-l-emerald-500",
} as const;

type Variant = keyof typeof BORDER_COLORS;

interface TaskSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  tasks: Task[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  variant: Variant;
}

function TaskSection({ title, icon, count, tasks, onToggle, onDelete, variant }: TaskSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{title}</h2>
        <span className="text-xs text-slate-500">({count})</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            borderColor={BORDER_COLORS[variant]}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

interface TaskListProps {
  overdueTasks: Task[];
  dueTodayTasks: Task[];
  pendingTasks: Task[];
  completedTasks: Task[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function TaskList({ overdueTasks, dueTodayTasks, pendingTasks, completedTasks, onToggle, onDelete }: TaskListProps) {
  return (
    <div className="space-y-6">
      {overdueTasks.length > 0 && (
        <TaskSection
          title="Overdue"
          icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
          count={overdueTasks.length}
          tasks={overdueTasks}
          onToggle={onToggle}
          onDelete={onDelete}
          variant="overdue"
        />
      )}
      {dueTodayTasks.length > 0 && (
        <TaskSection
          title="Due Today"
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          count={dueTodayTasks.length}
          tasks={dueTodayTasks}
          onToggle={onToggle}
          onDelete={onDelete}
          variant="today"
        />
      )}
      {pendingTasks.length > 0 && (
        <TaskSection
          title="Upcoming"
          icon={<Circle className="w-4 h-4 text-slate-400" />}
          count={pendingTasks.length}
          tasks={pendingTasks}
          onToggle={onToggle}
          onDelete={onDelete}
          variant="default"
        />
      )}
      {completedTasks.length > 0 && (
        <TaskSection
          title="Completed"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          count={completedTasks.length}
          tasks={completedTasks}
          onToggle={onToggle}
          onDelete={onDelete}
          variant="completed"
        />
      )}
    </div>
  );
}
