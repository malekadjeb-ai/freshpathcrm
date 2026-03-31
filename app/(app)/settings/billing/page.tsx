"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  CreditCard,
  ExternalLink,
  Check,
  Zap,
  Shield,
  BarChart3,
  Users,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BillingData {
  plan: string;
  status: string;
  hasSubscription: boolean;
}

const proFeatures = [
  { icon: Users, label: "Unlimited team members" },
  { icon: BarChart3, label: "Advanced analytics & reports" },
  { icon: Shield, label: "Priority support" },
  { icon: Clock, label: "Automated scheduling" },
  { icon: Zap, label: "API integrations" },
  { icon: Sparkles, label: "Custom branding" },
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const billingParam = searchParams.get("billing");
    if (billingParam === "success") {
      toast.success("Subscription activated! Welcome to Pro.");
    } else if (billingParam === "cancelled") {
      toast.info("Checkout cancelled.");
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchBilling() {
      try {
        const res = await fetch("/api/billing/status");
        if (res.ok) {
          const data = await res.json();
          setBilling(data);
        }
      } catch {
        // Will show default FREE state
      } finally {
        setLoading(false);
      }
    }
    fetchBilling();
  }, []);

  const handleUpgrade = async () => {
    setLoadingCheckout(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleManageBilling = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoadingPortal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const plan = billing?.plan || "FREE";
  const status = billing?.status || "ACTIVE";
  const isPro = plan === "PRO";

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">
          Billing & Subscription
        </h2>
        <p className="text-slate-500 mt-1">
          Manage your plan and payment details
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge
                  variant={isPro ? "default" : "secondary"}
                  className={
                    isPro
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : ""
                  }
                >
                  {plan}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {isPro
                  ? "You have access to all Pro features"
                  : "Upgrade to unlock all features"}
              </CardDescription>
            </div>
            {status === "PAST_DUE" && (
              <Badge variant="destructive">Payment Past Due</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CreditCard className="h-4 w-4" />
                <span>$300/month</span>
                <span className="text-slate-400">|</span>
                <span>Status: {status}</span>
              </div>
              <Button
                onClick={handleManageBilling}
                disabled={loadingPortal}
                variant="outline"
              >
                {loadingPortal ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Manage Billing
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-slate-900">
                    $300
                  </span>
                  <span className="text-slate-500">/month</span>
                </div>
                <p className="text-sm text-slate-600 mb-6">
                  Everything you need to run your detailing business
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {proFeatures.map((feature) => (
                    <div
                      key={feature.label}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      {feature.label}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleUpgrade}
                  disabled={loadingCheckout}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {loadingCheckout ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Upgrade to Pro
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
