"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ClipboardList, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface ServiceItem {
  id: string;
  name: string;
  basePrice: number;
  category: string;
  modifiers: { vehicleType: string; priceMultiplier: number }[];
}

interface CustomerResult {
  id: string;
  name: string;
  phone: string | null;
  vehicleSummary: string | null;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  vehicleType: string;
}

interface QuickEstimateProps {
  onClose: () => void;
  prefillCustomerId?: string;
}

export function QuickEstimate({ onClose, prefillCustomerId }: QuickEstimateProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState(prefillCustomerId || "");
  const [customerName, setCustomerName] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleType, setVehicleType] = useState("Sedan");
  const [selectedServices, setSelectedServices] = useState<Map<string, { id: string; name: string; price: number }>>(new Map());
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");

  // Search customers
  const { data: searchResults = [] } = useQuery<CustomerResult[]>({
    queryKey: ["customer-search", customerSearch],
    queryFn: () => fetch(`/api/customers/search?q=${encodeURIComponent(customerSearch)}`).then((r) => r.json()),
    enabled: customerSearch.length >= 1 && !customerId,
  });

  // Load customer vehicles
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["customer-vehicles", customerId],
    queryFn: () => fetch(`/api/customers/${customerId}/vehicles`).then((r) => r.json()),
    enabled: !!customerId,
  });

  // Load services
  const { data: services = [] } = useQuery<ServiceItem[]>({
    queryKey: ["services-active"],
    queryFn: () => fetch("/api/services?active=true").then((r) => r.json()),
  });

  // Auto-select single vehicle
  useEffect(() => {
    if (vehicles.length === 1) {
      setVehicleId(vehicles[0].id);
      setVehicleType(vehicles[0].vehicleType);
    }
  }, [vehicles]);

  // Focus search on mount
  useEffect(() => {
    if (!prefillCustomerId) setTimeout(() => searchRef.current?.focus(), 100);
  }, [prefillCustomerId]);

  const selectCustomer = (c: CustomerResult) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerSearch("");
  };

  const getServicePrice = (service: ServiceItem): number => {
    const modifier = service.modifiers?.find((m) => m.vehicleType === vehicleType);
    return modifier ? service.basePrice * modifier.priceMultiplier : service.basePrice;
  };

  const toggleService = (service: ServiceItem) => {
    const next = new Map(selectedServices);
    if (next.has(service.id)) {
      next.delete(service.id);
    } else {
      next.set(service.id, { id: service.id, name: service.name, price: getServicePrice(service) });
    }
    setSelectedServices(next);
  };

  // Update prices when vehicle type changes
  useEffect(() => {
    if (selectedServices.size === 0) return;
    const next = new Map(selectedServices);
    next.forEach((item, id) => {
      const service = services.find((s) => s.id === id);
      if (service) {
        next.set(id, { ...item, price: getServicePrice(service) });
      }
    });
    setSelectedServices(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleType]);

  const subtotal = Array.from(selectedServices.values()).reduce((sum, s) => sum + s.price, 0);
  const total = Math.max(0, subtotal - discount);

  const coreServices = services.filter((s) => s.category === "Service" || s.category === "Core");
  const addOns = services.filter((s) => s.category === "Add-On" || s.category === "AddOn" || s.category === "Add-on");

  const createMutation = useMutation({
    mutationFn: async () => {
      const lineItems = Array.from(selectedServices.values()).map((s) => ({
        serviceId: s.id,
        name: s.name,
        price: s.price,
        quantity: 1,
      }));

      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          vehicleId: vehicleId || undefined,
          lineItems,
          discount,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (estimate) => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      onClose();
      toast.success(`Estimate ${estimate.estimateNumber} created — ${formatCurrency(estimate.total)}`, {
        action: { label: "View", onClick: () => router.push(`/estimates/${estimate.id}`) },
      });
    },
    onError: () => toast.error("Failed to create estimate"),
  });

  const canSubmit = customerId && selectedServices.size > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-slate-200">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <ClipboardList className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Quick Estimate</h2>
          <p className="text-xs text-slate-500">Select customer, tap services, done</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Customer Search */}
        {!customerId ? (
          <div className="relative">
            <Label className="text-sm font-medium">Customer *</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                ref={searchRef}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Type name or phone..."
                className="pl-9"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                  >
                    <div>
                      <span className="font-medium text-sm text-slate-900">{c.name}</span>
                      {c.vehicleSummary && <span className="text-xs text-slate-400 ml-2">{c.vehicleSummary}</span>}
                    </div>
                    {c.phone && <span className="text-xs text-slate-400">{c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
            <span className="font-medium text-sm text-slate-900">{customerName}</span>
            <button onClick={() => { setCustomerId(""); setCustomerName(""); setVehicleId(""); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Vehicle selector */}
        {customerId && vehicles.length > 1 && (
          <div>
            <Label className="text-sm font-medium">Vehicle</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { setVehicleId(v.id); setVehicleType(v.vehicleType); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    vehicleId === v.id
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {v.year} {v.make} {v.model}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {customerId && (
          <>
            <div>
              <Label className="text-sm font-medium">Services *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {coreServices.map((s) => {
                  const isSelected = selectedServices.has(s.id);
                  const price = getServicePrice(s);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleService(s)}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all min-h-[64px] ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-900 block">{s.name}</span>
                      <span className="text-sm font-bold text-emerald-600">{formatCurrency(price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {addOns.length > 0 && (
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Add-ons</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {addOns.map((s) => {
                    const isSelected = selectedServices.has(s.id);
                    const price = getServicePrice(s);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleService(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {s.name} +{formatCurrency(price)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Discount */}
            {selectedServices.size > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm shrink-0">Discount $</Label>
                <Input
                  type="number"
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24"
                  min={0}
                />
              </div>
            )}

            {/* Notes */}
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
            />
          </>
        )}
      </div>

      {/* Pricing footer */}
      {selectedServices.size > 0 && (
        <div className="border-t border-slate-200 p-4 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({selectedServices.size} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 text-base pt-1 border-t">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
              className="flex-1"
            >
              Save Draft
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending ? "Creating..." : `Send — ${formatCurrency(total)}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
