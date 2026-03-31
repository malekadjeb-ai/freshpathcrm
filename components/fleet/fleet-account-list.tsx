"use client";

import Link from "next/link";
import { Building2, Car, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { FleetCustomer, TERMS_LABELS } from "./types";

interface FleetAccountListProps {
  customers: FleetCustomer[];
  isLoading: boolean;
}

export function FleetAccountList({ customers, isLoading }: FleetAccountListProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        Fleet Accounts ({customers.length})
      </h2>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-1">No fleet accounts yet</p>
            <p className="text-xs text-slate-400">
              Mark customers as &quot;Fleet / Commercial&quot; in their profile
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{c.companyName || c.name}</span>
                        <Badge className="bg-blue-100 text-blue-700 text-[10px]">Fleet</Badge>
                      </div>
                      {c.companyName && c.companyName !== c.name && (
                        <p className="text-xs text-slate-500">{c.name}</p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {c.fleetSize || c.vehicles.length} vehicles
                        </span>
                        {c.fleetDiscount != null && c.fleetDiscount > 0 && (
                          <span className="flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            {c.fleetDiscount}% discount
                          </span>
                        )}
                        {c.paymentTerms && (
                          <span>{TERMS_LABELS[c.paymentTerms] || c.paymentTerms}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-emerald-600">{formatCurrency(c.totalSpent)}</div>
                      <div className="text-xs text-slate-400">{c.jobCount} jobs</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
