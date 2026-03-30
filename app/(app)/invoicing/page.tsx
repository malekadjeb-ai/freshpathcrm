"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { FileText, DollarSign, Receipt, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";

const InvoicesContent = dynamic(() => import("@/app/(app)/invoices/page"), { loading: () => <PageSkeleton /> });
const PaymentsContent = dynamic(() => import("@/app/(app)/payments/page"), { loading: () => <PageSkeleton /> });
const ExpensesContent = dynamic(() => import("@/app/(app)/expenses/page"), { loading: () => <PageSkeleton /> });
const PlansContent = dynamic(() => import("@/app/(app)/subscriptions/page"), { loading: () => <PageSkeleton /> });

const tabs = [
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "payments", label: "Payments", icon: DollarSign },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "plans", label: "Plans", icon: CreditCard },
] as const;

type TabId = (typeof tabs)[number]["id"];

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  invoices: InvoicesContent,
  payments: PaymentsContent,
  expenses: ExpensesContent,
  plans: PlansContent,
};

export default function InvoicingHub() {
  const [activeTab, setActiveTab] = useState<TabId>("invoices");
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-4 md:px-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Invoicing hub tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ActiveComponent />
      </div>
    </div>
  );
}
