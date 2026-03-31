"use client";

import { Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface TaskFiltersProps {
  search: string;
  filterPriority: string;
  filterCompleted: string;
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onCompletedChange: (value: string) => void;
}

export function TaskFilters({
  search,
  filterPriority,
  filterCompleted,
  onSearchChange,
  onPriorityChange,
  onCompletedChange,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={filterPriority} onValueChange={(v) => onPriorityChange(v ?? "")}>
        <SelectTrigger className="w-full md:w-40 bg-white border-slate-200">
          <Filter className="w-4 h-4 mr-2 text-slate-500" />
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterCompleted} onValueChange={(v) => onCompletedChange(v ?? "")}>
        <SelectTrigger className="w-full md:w-40 bg-white border-slate-200">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="false">Pending</SelectItem>
          <SelectItem value="true">Completed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
