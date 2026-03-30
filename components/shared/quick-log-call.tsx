"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Phone,
  MessageSquare,
  PhoneMissed,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CustomerResult {
  id: string;
  name: string;
  phone: string | null;
  lastJobAt: string | null;
  vehicleSummary: string | null;
}

type LogType = "call" | "text" | "missed";
type Direction = "inbound" | "outbound";
type Outcome = "booked" | "follow_up" | "no_answer" | "voicemail" | "completed";

const OUTCOME_OPTIONS: { value: Outcome; label: string }[] = [
  { value: "booked", label: "Booked" },
  { value: "follow_up", label: "Follow Up" },
  { value: "no_answer", label: "No Answer" },
  { value: "voicemail", label: "Voicemail" },
];

export function QuickLogCall() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Form state
  const [logType, setLogType] = useState<LogType>("call");
  const [direction, setDirection] = useState<Direction>("inbound");
  const [outcome, setOutcome] = useState<Outcome>("completed");
  const [duration, setDuration] = useState(5);
  const [note, setNote] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Alt+L
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Customer search
  const { data: customers = [] } = useQuery<CustomerResult[]>({
    queryKey: ["customer-search-quick", customerSearch],
    queryFn: () =>
      fetch(
        `/api/customers/search?q=${encodeURIComponent(customerSearch)}`
      ).then((r) => r.json()),
    enabled: open,
  });

  const reset = useCallback(() => {
    setLogType("call");
    setDirection("inbound");
    setOutcome("completed");
    setDuration(5);
    setNote("");
    setCustomerSearch("");
    setSelectedCustomer(null);
    setMessageBody("");
    setShowDropdown(false);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  // Log mutation
  const logMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error("Select a customer");

      const isMissed = logType === "missed";
      const isText = logType === "text";

      const commData = {
        customerId: selectedCustomer.id,
        type: isMissed ? "call" : isText ? "sms" : "call",
        direction: isMissed ? "missed" : direction,
        status: isMissed
          ? "missed"
          : isText
            ? direction === "inbound"
              ? "received"
              : "sent"
            : "completed",
        summary: note || undefined,
        body: isText ? messageBody || undefined : undefined,
        duration: !isText && !isMissed ? duration * 60 : undefined,
        outcome: isMissed ? "no_answer" : outcome,
        channel: isText ? "sms" : "call",
        source: "manual",
      };

      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commData),
      });
      if (!res.ok) throw new Error("Failed to log");

      // Auto-create task for missed calls, follow-ups, and no-answers
      if (isMissed || outcome === "no_answer" || outcome === "follow_up") {
        const taskTitle =
          isMissed || outcome === "no_answer"
            ? `Call back ${selectedCustomer.name}`
            : `Follow up with ${selectedCustomer.name}`;

        const dueDate = new Date();
        if (isMissed || outcome === "no_answer") {
          dueDate.setMinutes(dueDate.getMinutes() + 30);
        } else {
          dueDate.setDate(dueDate.getDate() + 1);
        }

        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: taskTitle,
            type: isMissed || outcome === "no_answer" ? "call_back" : "follow_up",
            priority: isMissed || outcome === "no_answer" ? "high" : "medium",
            dueDate: dueDate.toISOString(),
            customerId: selectedCustomer.id,
          }),
        });
      }

      return { outcome, customer: selectedCustomer };
    },
    onSuccess: (data) => {
      const typeLabel =
        logType === "missed"
          ? "Missed call"
          : logType === "text"
            ? "Text"
            : `${duration} min ${direction} call`;

      toast.success(`Logged — ${data.customer.name}, ${typeLabel}`, {
        action:
          data.outcome === "booked"
            ? {
                label: "Create Job",
                onClick: () =>
                  router.push(`/jobs/new?customerId=${data.customer.id}`),
              }
            : undefined,
      });

      queryClient.invalidateQueries({ queryKey: ["communications"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      handleClose();
    },
    onError: () => toast.error("Failed to log communication"),
  });

  const canSubmit = !!selectedCustomer;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 md:bottom-6 z-40 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        title="Quick Log (Alt+L)"
      >
        <Phone className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={handleClose}
      />

      {/* Sheet — bottom on mobile, right panel on desktop */}
      <div className="fixed inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-96 z-50 bg-white rounded-t-2xl md:rounded-none shadow-2xl flex flex-col max-h-[90vh] md:max-h-full animate-in slide-in-from-bottom md:slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-slate-900">Quick Log</h2>
            <kbd className="hidden md:inline text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono">
              Alt+L
            </kbd>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://voice.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1"
            >
              Google Voice <ExternalLink className="w-3 h-3" />
            </a>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Type toggles */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "call" as LogType, icon: Phone, label: "Call" },
              { value: "text" as LogType, icon: MessageSquare, label: "Text" },
              { value: "missed" as LogType, icon: PhoneMissed, label: "Missed" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setLogType(t.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-medium transition-all min-h-[56px]",
                  logType === t.value
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                <t.icon className="w-5 h-5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Customer search */}
          <div className="relative">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Customer or Phone
            </label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 min-h-[48px]">
                <div>
                  <div className="font-medium text-sm text-slate-900">
                    {selectedCustomer.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedCustomer.phone || "No phone"}
                    {selectedCustomer.vehicleSummary &&
                      ` · ${selectedCustomer.vehicleSummary}`}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch("");
                    setTimeout(() => searchRef.current?.focus(), 50);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    ref={searchRef}
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search name or phone..."
                    className="pl-9 h-12 text-base"
                    autoComplete="off"
                  />
                </div>
                {showDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                    {customers.length > 0 ? (
                      customers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors min-h-[48px]"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setShowDropdown(false);
                            setCustomerSearch("");
                          }}
                        >
                          <div className="font-medium text-sm">{c.name}</div>
                          <div className="text-xs text-slate-400">
                            {c.phone || "No phone"}
                            {c.vehicleSummary && ` · ${c.vehicleSummary}`}
                          </div>
                        </button>
                      ))
                    ) : customerSearch.length > 1 ? (
                      <div className="px-4 py-3 text-sm text-slate-400">
                        No matches found
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400">
                        Start typing to search...
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Direction (not for missed) */}
          {logType !== "missed" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: "inbound" as Direction,
                    icon: ArrowDownLeft,
                    label: logType === "text" ? "They texted me" : "They called me",
                  },
                  {
                    value: "outbound" as Direction,
                    icon: ArrowUpRight,
                    label: logType === "text" ? "I texted them" : "I called them",
                  },
                ].map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDirection(d.value)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all min-h-[48px]",
                      direction === d.value
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    <d.icon className="w-4 h-4 shrink-0" />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Duration (calls only) */}
          {logType === "call" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Duration (minutes)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 5, 10, 15].map((m) => (
                  <button
                    key={m}
                    onClick={() => setDuration(m)}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all min-h-[44px]",
                      duration === m
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {m}
                  </button>
                ))}
                <Input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                  className="w-16 h-11 text-center"
                />
              </div>
            </div>
          )}

          {/* Outcome (calls only, not texts) */}
          {logType !== "text" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Outcome
              </label>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setOutcome(o.value)}
                    className={cn(
                      "px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all min-h-[44px]",
                      outcome === o.value
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message body (texts only) */}
          {logType === "text" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Message (optional)
              </label>
              <Textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Paste or type the message..."
                rows={3}
                className="resize-none text-base"
              />
            </div>
          )}

          {/* Quick note */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Quick note (optional)
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Wants Saturday detail..."
              className="h-12 text-base"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100">
          <Button
            onClick={() => logMutation.mutate()}
            disabled={!canSubmit || logMutation.isPending}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white text-base font-semibold rounded-xl"
          >
            {logMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Phone className="w-5 h-5 mr-2" />
            )}
            {logMutation.isPending ? "Logging..." : "LOG IT"}
          </Button>
        </div>
      </div>
    </>
  );
}
