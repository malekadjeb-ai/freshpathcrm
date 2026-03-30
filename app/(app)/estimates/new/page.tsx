"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, fetchJson } from "@/lib/utils";

interface ServiceItem {
  id: string;
  name: string;
  basePrice: number;
  category: string;
  isActive: boolean;
  modifiers: { vehicleType: string; priceAdjustment: number }[];
}

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

interface LineItem {
  key: string;
  serviceId: string | null;
  name: string;
  description: string;
  price: number;
  quantity: number;
}

export default function NewEstimatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ["customers-search", customerSearch],
    queryFn: () =>
      fetchJson(`/api/customers?search=${customerSearch}`),
    enabled: customerSearch.length > 0,
  });

  const { data: allCustomers = [] } = useQuery<CustomerOption[]>({
    queryKey: ["customers-all"],
    queryFn: () => fetchJson("/api/customers"),
  });

  const { data: services = [] } = useQuery<ServiceItem[]>({
    queryKey: ["services"],
    queryFn: () => fetchJson("/api/services?active=true"),
  });

  const selectedCustomer = [...allCustomers, ...customers].find(
    (c) => c.id === selectedCustomerId
  );
  const selectedVehicle = selectedCustomer?.vehicles.find(
    (v) => v.id === selectedVehicleId
  );
  const vehicleType = selectedVehicle?.vehicleType || "Sedan";

  const getPriceForVehicle = (service: ServiceItem, vType: string) => {
    const modifier = service.modifiers.find((m) => m.vehicleType === vType);
    return service.basePrice + (modifier?.priceAdjustment ?? 0);
  };

  const addServiceItem = (service: ServiceItem) => {
    if (lineItems.some((li) => li.serviceId === service.id)) return;
    setLineItems([
      ...lineItems,
      {
        key: crypto.randomUUID(),
        serviceId: service.id,
        name: service.name,
        description: "",
        price: getPriceForVehicle(service, vehicleType),
        quantity: 1,
      },
    ]);
  };

  const addCustomItem = () => {
    setLineItems([
      ...lineItems,
      {
        key: crypto.randomUUID(),
        serviceId: null,
        name: "",
        description: "",
        price: 0,
        quantity: 1,
      },
    ]);
  };

  const updateLineItem = (key: string, field: string, value: string | number) => {
    setLineItems(
      lineItems.map((li) => (li.key === key ? { ...li, [field]: value } : li))
    );
  };

  const removeLineItem = (key: string) => {
    setLineItems(lineItems.filter((li) => li.key !== key));
  };

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.price * li.quantity,
    0
  );
  const total = Math.max(0, subtotal - discount);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          vehicleId: selectedVehicleId || null,
          lineItems: lineItems.map((li) => ({
            serviceId: li.serviceId,
            name: li.name,
            description: li.description || undefined,
            price: li.price,
            quantity: li.quantity,
          })),
          discount,
          notes,
          validUntil: validUntil || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create estimate");
      return res.json();
    },
    onSuccess: (est) => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast.success("Estimate created");
      router.push(`/estimates/${est.id}`);
    },
    onError: () => toast.error("Failed to create estimate"),
  });

  const canSubmit = selectedCustomerId && lineItems.length > 0 && lineItems.every((li) => li.name);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link
          href="/estimates"
          className="hover:text-slate-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Estimates
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-900">New Estimate</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Estimate</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
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

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                <Button variant="outline" size="sm" onClick={addCustomItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Custom Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Service catalog */}
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  From Service Catalog
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {services.map((service) => {
                    const price = getPriceForVehicle(service, vehicleType);
                    const selected = lineItems.some(
                      (li) => li.serviceId === service.id
                    );
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => addServiceItem(service)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          selected
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="font-medium text-sm text-slate-900">
                          {service.name}
                        </div>
                        <div className="text-emerald-600 text-sm font-semibold mt-0.5">
                          {formatCurrency(price)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {lineItems.length > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Selected Items
                  </p>
                  {lineItems.map((li) => (
                    <div
                      key={li.key}
                      className="flex items-center gap-3 bg-slate-50 rounded-lg p-3"
                    >
                      {li.serviceId ? (
                        <span className="flex-1 text-sm font-medium text-slate-700">
                          {li.name}
                        </span>
                      ) : (
                        <Input
                          className="flex-1 text-sm"
                          placeholder="Item name"
                          value={li.name}
                          onChange={(e) =>
                            updateLineItem(li.key, "name", e.target.value)
                          }
                        />
                      )}
                      <Input
                        type="number"
                        className="w-16 text-center text-sm"
                        value={li.quantity}
                        onChange={(e) =>
                          updateLineItem(
                            li.key,
                            "quantity",
                            parseInt(e.target.value) || 1
                          )
                        }
                      />
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24 text-right text-sm"
                        value={li.price}
                        onChange={(e) =>
                          updateLineItem(
                            li.key,
                            "price",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeLineItem(li.key)}
                        className="text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for the estimate..."
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estimate Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {lineItems.map((li) => (
                  <div key={li.key} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {li.name || "Unnamed"}{" "}
                      {li.quantity > 1 && `x${li.quantity}`}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(li.price * li.quantity)}
                    </span>
                  </div>
                ))}
                {lineItems.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">
                    No items added
                  </p>
                )}
              </div>

              {lineItems.length > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      className="flex-1 text-sm"
                      placeholder="Discount ($)"
                      value={discount || ""}
                      onChange={(e) =>
                        setDiscount(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Discount</span>
                      <span>- {formatCurrency(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-lg border-t border-slate-100 pt-2">
                    <span>Total</span>
                    <span className="text-emerald-600">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={!canSubmit || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Creating..." : "Create Estimate"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
