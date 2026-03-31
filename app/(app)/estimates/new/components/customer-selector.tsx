"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehicles: {
    id: string;
    make: string;
    model: string;
    year: number;
    vehicleType: string;
    color: string | null;
  }[];
}

interface CustomerSelectorProps {
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  selectedCustomerId: string;
  setSelectedCustomerId: (v: string) => void;
  selectedVehicleId: string;
  setSelectedVehicleId: (v: string) => void;
  customers: CustomerOption[];
  selectedCustomer: CustomerOption | undefined;
}

export function CustomerSelector({
  customerSearch,
  setCustomerSearch,
  selectedCustomerId,
  setSelectedCustomerId,
  selectedVehicleId,
  setSelectedVehicleId,
  customers,
  selectedCustomer,
}: CustomerSelectorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Customer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!selectedCustomerId ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search customer by name, phone, email..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            {customerSearch.length > 1 && customers.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerSearch("");
                    }}
                  >
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-slate-400">
                      {c.phone ?? c.email ?? "No contact"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <div>
              <div className="font-medium text-slate-900">
                {selectedCustomer?.name}
              </div>
              <div className="text-xs text-slate-500">
                {selectedCustomer?.phone ?? selectedCustomer?.email ?? ""}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedCustomerId("");
                setSelectedVehicleId("");
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              Change
            </Button>
          </div>
        )}

        {selectedCustomer && selectedCustomer.vehicles.length > 0 && (
          <div className="space-y-1.5">
            <Label>Vehicle</Label>
            <Select
              value={selectedVehicleId}
              onValueChange={(v) => setSelectedVehicleId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle (optional)" />
              </SelectTrigger>
              <SelectContent>
                {selectedCustomer.vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model} ({v.vehicleType})
                    {v.color ? ` — ${v.color}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
