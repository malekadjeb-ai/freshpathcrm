"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Search, Tag, X, Star, RefreshCw, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, LOCATIONS, LOCATION_LABELS, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

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
  address: string | null;
  city: string | null;
  vehicles: { id: string; make: string; model: string; year: number; vehicleType: string; color: string | null }[];
}

interface SelectedService {
  serviceItemId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

function NewJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledCustomerId = searchParams.get("customerId") || "";
  const prefilledVehicleId = searchParams.get("vehicleId") || "";
  const queryClient = useQueryClient();

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(prefilledCustomerId);
  const [selectedVehicleId, setSelectedVehicleId] = useState(prefilledVehicleId);
  const [selectedVehicleType, setSelectedVehicleType] = useState("Sedan");
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState<"Richmond" | "Katy" | "SugarLand" | "Other">("Richmond");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"dollar" | "percent">("dollar");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    promoCodeId: string;
    code: string;
    discountType: string;
    discountValue: number;
    discount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState("");

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ["customers-search", customerSearch],
    queryFn: () =>
      fetchJson(`/api/customers?search=${customerSearch}`),
    enabled: customerSearch.length > 0 || !!prefilledCustomerId,
  });

  const { data: allCustomers = [], isError: isCustomersError, refetch: refetchCustomers } = useQuery<CustomerOption[]>({
    queryKey: ["customers-all"],
    queryFn: () => fetchJson("/api/customers"),
  });

  const { data: services = [], isError: isServicesError, refetch: refetchServices } = useQuery<ServiceItem[]>({
    queryKey: ["services"],
    queryFn: () => fetchJson("/api/services?active=true"),
  });

  // Returning customer detection
  const { data: customerHistory } = useQuery<{
    jobCount: number;
    totalSpent: number;
    lastJobDate: string | null;
  }>({
    queryKey: ["customer-history", selectedCustomerId],
    queryFn: () => fetchJson(`/api/customers/${selectedCustomerId}/history`),
    enabled: !!selectedCustomerId,
  });
  const isReturning = (customerHistory?.jobCount ?? 0) > 0;

  const selectedCustomer = [...allCustomers, ...customers].find(
    (c) => c.id === selectedCustomerId
  );
  const selectedVehicle = selectedCustomer?.vehicles.find((v) => v.id === selectedVehicleId);

  useEffect(() => {
    if (selectedVehicle) {
      setSelectedVehicleType(selectedVehicle.vehicleType);
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (selectedCustomer && !address) {
      setAddress(selectedCustomer.address ?? "");
      setCity(selectedCustomer.city ?? "");
      const cityMap: Record<string, "Richmond" | "Katy" | "SugarLand" | "Other"> = {
        Richmond: "Richmond",
        Katy: "Katy",
        "Sugar Land": "SugarLand",
      };
      setLocation(cityMap[selectedCustomer.city ?? ""] ?? "Other");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]);

  const getPriceForVehicle = (service: ServiceItem, vehicleType: string) => {
    const modifier = service.modifiers.find((m) => m.vehicleType === vehicleType);
    return service.basePrice + (modifier?.priceAdjustment ?? 0);
  };

  const toggleService = (service: ServiceItem) => {
    const existing = selectedServices.find((s) => s.serviceItemId === service.id);
    if (existing) {
      setSelectedServices(selectedServices.filter((s) => s.serviceItemId !== service.id));
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          serviceItemId: service.id,
          name: service.name,
          price: getPriceForVehicle(service, selectedVehicleType),
          quantity: 1,
          category: service.category,
        },
      ]);
    }
  };

  const updateServicePrice = (serviceItemId: string, price: number) => {
    setSelectedServices(
      selectedServices.map((s) => (s.serviceItemId === serviceItemId ? { ...s, price } : s))
    );
  };

  const addCustomService = () => {
    const customId = `custom-${Date.now()}`;
    setSelectedServices([
      ...selectedServices,
      {
        serviceItemId: customId,
        name: "Custom Service",
        price: 0,
        quantity: 1,
        category: "Custom",
      },
    ]);
  };

  const updateServiceName = (serviceItemId: string, name: string) => {
    setSelectedServices(
      selectedServices.map((s) => (s.serviceItemId === serviceItemId ? { ...s, name } : s))
    );
  };

  const subtotal = selectedServices.reduce((sum, s) => sum + s.price * s.quantity, 0);
  const discountAmount = discountType === "percent" ? subtotal * (discount / 100) : discount;
  const promoDiscount = appliedPromo
    ? appliedPromo.discountType === "percent"
      ? Math.max(0, subtotal - discountAmount) * (appliedPromo.discountValue / 100)
      : Math.min(appliedPromo.discountValue, Math.max(0, subtotal - discountAmount))
    : 0;
  const total = Math.max(0, subtotal - discountAmount - promoDiscount);

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoError("");
    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), subtotal }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedPromo(data);
        setPromoInput("");
        toast.success(`Promo code "${data.code}" applied!`);
      } else {
        setPromoError(data.error || "Invalid promo code");
      }
    } catch {
      setPromoError("Failed to validate promo code");
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          vehicleId: selectedVehicleId || undefined,
          services: selectedServices.map((s) => ({
            serviceItemId: s.serviceItemId.startsWith("custom-") ? undefined : s.serviceItemId,
            name: s.name,
            price: s.price,
            quantity: s.quantity,
          })),
          scheduledAt: scheduledAt || undefined,
          address,
          city,
          location,
          discount,
          discountType,
          notes,
          internalNotes,
          promoCodeId: appliedPromo?.promoCodeId || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create job");
      return res.json();
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job created");
      router.push(`/jobs/${job.id}`);
    },
    onError: () => toast.error("Failed to create job"),
  });

  const coreServices = services.filter((s) => s.category === "Service");
  const addOnServices = services.filter((s) => s.category === "AddOn");

  const canSubmit = selectedCustomerId && selectedServices.length > 0;

  if (isCustomersError) return <ErrorState message="Failed to load customers." onRetry={refetchCustomers} />;
  if (isServicesError) return <ErrorState message="Failed to load services." onRetry={refetchServices} />;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/jobs" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Jobs
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-900">New Job</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Job</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer + Services */}
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
                          <div className="text-xs text-slate-400">{c.phone ?? c.email ?? "No contact"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{selectedCustomer?.name}</span>
                        {isReturning && (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px] gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Returning
                          </Badge>
                        )}
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
                  {isReturning && customerHistory && (
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-emerald-200 text-xs text-slate-600">
                      <span><Star className="w-3 h-3 text-amber-500 inline mr-0.5" />{customerHistory.jobCount} previous job{customerHistory.jobCount > 1 ? "s" : ""}</span>
                      <span>${customerHistory.totalSpent.toFixed(0)} lifetime value</span>
                      {customerHistory.lastJobDate && (
                        <span>Last: {new Date(customerHistory.lastJobDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedCustomer && selectedCustomer.vehicles.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Vehicle</Label>
                  <Select value={selectedVehicleId} onValueChange={(v) => setSelectedVehicleId(v ?? "")}>
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

              {!selectedVehicleId && (
                <div className="space-y-1.5">
                  <Label>Vehicle Type (for pricing)</Label>
                  <Select value={selectedVehicleType} onValueChange={(v) => setSelectedVehicleType(v ?? "Sedan")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Sedan", "SUV", "Truck", "Van", "Luxury"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Core Services</p>
                <div className="grid grid-cols-2 gap-2">
                  {coreServices.map((service) => {
                    const price = getPriceForVehicle(service, selectedVehicleType);
                    const selected = selectedServices.some((s) => s.serviceItemId === service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          selected
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="font-medium text-sm text-slate-900">{service.name}</div>
                        <div className="text-emerald-600 text-sm font-semibold mt-0.5">
                          {formatCurrency(price)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Add-Ons</p>
                <div className="grid grid-cols-2 gap-2">
                  {addOnServices.map((service) => {
                    const price = getPriceForVehicle(service, selectedVehicleType);
                    const selected = selectedServices.some((s) => s.serviceItemId === service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          selected
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="font-medium text-sm text-slate-900">{service.name}</div>
                        <div className="text-emerald-600 text-sm font-semibold mt-0.5">
                          {formatCurrency(price)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={addCustomService}
                className="mt-3 w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Custom Service</span>
              </button>

              {selectedServices.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Selected Services
                  </p>
                  {selectedServices.map((s) => (
                    <div key={s.serviceItemId} className="flex items-center gap-3">
                      {s.category === "Custom" ? (
                        <Input
                          type="text"
                          placeholder="Service name..."
                          className="flex-1 text-sm"
                          value={s.name}
                          onChange={(e) => updateServiceName(s.serviceItemId, e.target.value)}
                        />
                      ) : (
                        <span className="flex-1 text-sm text-slate-700">{s.name}</span>
                      )}
                      <span className="text-xs text-slate-400">{s.category}</span>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24 text-right text-sm"
                        value={s.price}
                        onChange={(e) =>
                          updateServicePrice(s.serviceItemId, parseFloat(e.target.value) || 0)
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedServices(selectedServices.filter((x) => x.serviceItemId !== s.serviceItemId))
                        }
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

          {/* Schedule + Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Schedule & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Scheduled Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Service Address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="1234 Main St"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Richmond"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Service Area</Label>
                  <Select value={location} onValueChange={(v) => setLocation(v as typeof location)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((l) => (
                        <SelectItem key={l} value={l}>{LOCATION_LABELS[l]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Customer-facing notes</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes visible to customer..."
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Internal notes</Label>
                <Textarea
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Internal notes (not visible to customer)..."
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Pricing summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pricing Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {selectedServices.map((s) => (
                  <div key={s.serviceItemId} className="flex justify-between text-sm">
                    <span className="text-slate-600">{s.name}</span>
                    <span className="font-medium">{formatCurrency(s.price)}</span>
                  </div>
                ))}
                {selectedServices.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">No services selected</p>
                )}
              </div>

              {selectedServices.length > 0 && (
                <>
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
                        placeholder="Discount"
                        value={discount || ""}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      />
                      <Select
                        value={discountType}
                        onValueChange={(v) => setDiscountType(v as "dollar" | "percent")}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dollar">$</SelectItem>
                          <SelectItem value="percent">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-red-500">
                        <span>Discount</span>
                        <span>- {formatCurrency(discountAmount)}</span>
                      </div>
                    )}

                    {/* Promo Code */}
                    <div className="border-t border-slate-100 pt-3">
                      {appliedPromo ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-700">{appliedPromo.code}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-red-500">
                              - {formatCurrency(promoDiscount)}
                            </span>
                            <button
                              onClick={() => setAppliedPromo(null)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Promo code"
                              value={promoInput}
                              onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                              className="flex-1 text-sm uppercase font-mono"
                              onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={applyPromo}
                              disabled={!promoInput.trim()}
                              className="shrink-0"
                            >
                              Apply
                            </Button>
                          </div>
                          {promoError && (
                            <p className="text-xs text-red-500 mt-1">{promoError}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between font-bold text-lg border-t border-slate-100 pt-2">
                      <span>Total</span>
                      <span className="text-emerald-600">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </>
              )}

              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={!canSubmit || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Creating..." : "Create Job"}
              </Button>
              {!selectedCustomerId && (
                <p className="text-xs text-slate-400 text-center">Select a customer to continue</p>
              )}
              {selectedCustomerId && selectedServices.length === 0 && (
                <p className="text-xs text-slate-400 text-center">Select at least one service</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewJobPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6"><div className="h-96 bg-slate-100 rounded-xl animate-pulse" /></div>}>
      <NewJobPage />
    </Suspense>
  );
}
