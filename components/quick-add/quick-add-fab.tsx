"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, X, Users, ClipboardList, FileText, Briefcase, Phone,
  Target, CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet";
import { QuickCustomer } from "./quick-customer";
import { QuickEstimate } from "./quick-estimate";
import { QuickInvoice } from "./quick-invoice";

type QuickAction = "customer" | "estimate" | "invoice" | "job" | "call" | "lead" | "task" | null;

const ACTIONS = [
  { key: "customer" as const, label: "New Customer", icon: Users, color: "bg-blue-500", shortcut: "Alt+C" },
  { key: "estimate" as const, label: "New Estimate", icon: ClipboardList, color: "bg-purple-500", shortcut: "Alt+E" },
  { key: "invoice" as const, label: "New Invoice", icon: FileText, color: "bg-orange-500", shortcut: "Alt+I" },
  { key: "job" as const, label: "New Job", icon: Briefcase, color: "bg-slate-700", shortcut: "Alt+J" },
  { key: "call" as const, label: "Log Call", icon: Phone, color: "bg-emerald-500", shortcut: "Alt+L" },
  { key: "lead" as const, label: "New Lead", icon: Target, color: "bg-pink-500", shortcut: "Alt+N" },
  { key: "task" as const, label: "New Task", icon: CheckSquare, color: "bg-amber-500", shortcut: "Alt+T" },
];

export function QuickAddFab() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<QuickAction>(null);

  const openAction = useCallback((action: QuickAction) => {
    setMenuOpen(false);
    if (action === "job") {
      window.location.href = "/jobs/new";
      return;
    }
    if (action === "call") {
      // Trigger the existing Quick Log Call
      document.dispatchEvent(new CustomEvent("open-quick-log"));
      return;
    }
    if (action === "lead") {
      window.location.href = "/leads";
      return;
    }
    if (action === "task") {
      window.location.href = "/tasks";
      return;
    }
    setActiveSheet(action);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      // Don't trigger in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const map: Record<string, QuickAction> = {
        c: "customer",
        e: "estimate",
        i: "invoice",
        j: "job",
        n: "lead",
        t: "task",
      };
      const action = map[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        openAction(action);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openAction]);

  // Listen for quick-add events from Command Palette
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as QuickAction;
      if (detail) openAction(detail);
    };
    document.addEventListener("quick-add", handler);
    return () => document.removeEventListener("quick-add", handler);
  }, [openAction]);

  return (
    <>
      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* FAB Menu */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col-reverse items-end gap-2">
        {/* Speed dial options */}
        {menuOpen &&
          ACTIONS.map((action, i) => (
            <button
              key={action.key}
              onClick={() => openAction(action.key)}
              className="flex items-center gap-3 pl-4 pr-3 py-2.5 bg-white rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-all animate-in slide-in-from-bottom-2 fade-in"
              style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
            >
              <span className="text-sm font-medium text-slate-700">{action.label}</span>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white", action.color)}>
                <action.icon className="w-5 h-5" />
              </div>
              <kbd className="hidden md:inline-block text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                {action.shortcut}
              </kbd>
            </button>
          ))}

        {/* Main FAB button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all text-white",
            menuOpen
              ? "bg-slate-800 rotate-45"
              : "bg-emerald-500 hover:bg-emerald-600 hover:scale-105"
          )}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Plus className="w-7 h-7" />}
        </button>
      </div>

      {/* Quick-Add Sheets */}
      <Sheet open={activeSheet === "customer"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0" showCloseButton={false}>
          <QuickCustomer onClose={() => setActiveSheet(null)} />
        </SheetContent>
      </Sheet>

      <Sheet open={activeSheet === "estimate"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0" showCloseButton={false}>
          <QuickEstimate onClose={() => setActiveSheet(null)} />
        </SheetContent>
      </Sheet>

      <Sheet open={activeSheet === "invoice"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0" showCloseButton={false}>
          <QuickInvoice onClose={() => setActiveSheet(null)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
