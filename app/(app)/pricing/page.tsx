"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PricingRule {
  id: string;
  name: string;
  type: string;
  modifier: number;
  conditions: string;
  isActive: boolean;
  priority: number;
}

const RULE_TYPES = [
  { value: "day_of_week", label: "Day of Week" },
  { value: "season", label: "Seasonal" },
  { value: "vehicle_type", label: "Vehicle Type" },
  { value: "demand", label: "Demand-Based" },
  { value: "time_of_day", label: "Time of Day" },
  { value: "same_day", label: "Same-Day Booking" },
];

const RULE_TEMPLATES = [
  { name: "Weekend Premium", type: "day_of_week", modifier: 1.15, conditions: { days: [0, 6] } },
  { name: "Slow Day Discount", type: "day_of_week", modifier: 0.9, conditions: { days: [2, 3] } },
  { name: "Peak Season (Spring)", type: "season", modifier: 1.1, conditions: { months: [4, 5, 6] } },
  { name: "Off-Peak Discount", type: "season", modifier: 0.85, conditions: { months: [1, 2] } },
  { name: "Large Vehicle Surcharge", type: "vehicle_type", modifier: 1.0, conditions: { vehicleTypes: ["SUV", "Truck"], flatAmount: 25 } },
  { name: "Early Bird Discount", type: "time_of_day", modifier: 0.95, conditions: { beforeHour: 9 } },
  { name: "Same-Day Rush", type: "same_day", modifier: 1.25, conditions: {} },
  { name: "High Demand Premium", type: "demand", modifier: 1.15, conditions: { threshold: 0.8 } },
];

export default function PricingPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", type: "day_of_week", modifier: "1.0", conditions: "{}" });
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading, isError, refetch } = useQuery<PricingRule[]>({
    queryKey: ["pricing-rules"],
    queryFn: () => fetchJson("/api/pricing-rules"),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/pricing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-rules"] });
      setShowCreate(false);
      toast.success("Pricing rule created");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/pricing-rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/pricing-rules/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast.success("Rule deleted");
    },
  });

  const addTemplate = (template: (typeof RULE_TEMPLATES)[number]) => {
    createMutation.mutate({
      name: template.name,
      type: template.type,
      modifier: template.modifier,
      conditions: template.conditions,
    });
  };

  const modifierDisplay = (modifier: number) => {
    if (modifier > 1) {
      return (
        <span className="text-red-600 font-medium flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          +{Math.round((modifier - 1) * 100)}%
        </span>
      );
    } else if (modifier < 1) {
      return (
        <span className="text-emerald-600 font-medium flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5" />
          -{Math.round((1 - modifier) * 100)}%
        </span>
      );
    }
    return <span className="text-slate-500">No change</span>;
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dynamic Pricing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated price adjustments based on demand, day, and season
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger>
            <Button><Plus className="w-4 h-4 mr-1.5" /> Add Rule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Pricing Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g., Weekend Premium"
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  value={newRule.type}
                  onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  {RULE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Modifier (1.0 = no change, 1.15 = +15%, 0.9 = -10%)</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={newRule.modifier}
                  onChange={(e) => setNewRule({ ...newRule, modifier: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  createMutation.mutate({
                    name: newRule.name,
                    type: newRule.type,
                    modifier: parseFloat(newRule.modifier),
                    conditions: {},
                  })
                }
                disabled={!newRule.name}
              >
                Create Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isError && <ErrorState message="Failed to load pricing rules." onRetry={refetch} />}

      {/* Quick Templates */}
      {rules.length === 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Start Templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {RULE_TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => addTemplate(t)}
                className="text-left p-3 rounded-lg border border-slate-200 bg-white hover:border-emerald-300 transition-colors"
              >
                <div className="text-sm font-medium text-slate-900">{t.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {t.modifier > 1 ? `+${Math.round((t.modifier - 1) * 100)}%` : `${Math.round((t.modifier - 1) * 100)}%`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rules List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-40 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-24" />
            </div>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Percent className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No pricing rules</h3>
          <p className="text-sm text-slate-500">Add rules above or use a template to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{rule.name}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {RULE_TYPES.find((t) => t.value === rule.type)?.label || rule.type}
                  </span>
                </div>
                <div className="mt-1">{modifierDisplay(rule.modifier)}</div>
              </div>
              <Switch
                checked={rule.isActive}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, isActive: checked })}
              />
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-red-500"
                onClick={() => {
                  if (confirm("Delete this pricing rule?")) {
                    deleteMutation.mutate(rule.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
