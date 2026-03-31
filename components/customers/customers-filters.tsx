"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomersFiltersProps {
  search: string;
  cityFilter: string;
  onSearchChange: (value: string) => void;
  onCityFilterChange: (value: string) => void;
}

export function CustomersFilters({
  search,
  cityFilter,
  onSearchChange,
  onCityFilterChange,
}: CustomersFiltersProps) {
  return (
    <div className="flex gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, email, phone..."
          className="pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select value={cityFilter} onValueChange={(v) => onCityFilterChange(v ?? "all")}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All locations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All locations</SelectItem>
          <SelectItem value="Richmond">Richmond</SelectItem>
          <SelectItem value="Katy">Katy</SelectItem>
          <SelectItem value="Sugar Land">Sugar Land</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
