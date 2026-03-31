"use client";

import { List, LayoutGrid } from "lucide-react";

interface JobsViewToggleProps {
  view: "kanban" | "list";
  onChange: (view: "kanban" | "list") => void;
}

export function JobsViewToggle({ view, onChange }: JobsViewToggleProps) {
  return (
    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => onChange("kanban")}
        className={`px-3 py-2 ${view === "kanban" ? "bg-slate-100" : ""}`}
        aria-label="Kanban view"
      >
        <LayoutGrid className="w-4 h-4 text-slate-500" />
      </button>
      <button
        onClick={() => onChange("list")}
        className={`px-3 py-2 ${view === "list" ? "bg-slate-100" : ""}`}
        aria-label="List view"
      >
        <List className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  );
}
