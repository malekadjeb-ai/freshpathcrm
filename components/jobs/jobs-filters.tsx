"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_STATUS_LABELS, LOCATIONS, LOCATION_LABELS } from "@/lib/utils";

interface JobsFiltersProps {
  search: string;
  statusFilter: string;
  locationFilter: string;
  dateRange: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
}

export function JobsFilters({
  search,
  statusFilter,
  locationFilter,
  dateRange,
  onSearchChange,
  onStatusChange,
  onLocationChange,
  onDateRangeChange,
}: JobsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9 w-56"
          placeholder="Search customer, service..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select value={statusFilter} onValueChange={(v) => onStatusChange(v ?? "all")}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {Object.entries(JOB_STATUS_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={locationFilter} onValueChange={(v) => onLocationChange(v ?? "all")}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All locations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All locations</SelectItem>
          {LOCATIONS.map((l) => (
            <SelectItem key={l} value={l}>{LOCATION_LABELS[l]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v ?? "all")}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All dates" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All dates</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This week</SelectItem>
          <SelectItem value="month">This month</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
