"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
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
import { formatCurrency, fetchJson, LOCATIONS, LOCATION_LABELS } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface ServiceItem {
  id: string;
  name: string;
  basePrice: number;
  category: string;
  isActive: boolean;
  modifiers: { vehicleType: string; priceAdjustment: number }[];
}

interface SelectedService {
  serviceItemId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

interface JobDetail {
  id: string;
  status: string;
  scheduledAt: string | null;
  address: string | null;
  city: string | null;
  location: string;
  subtotal: number;
  discount: number;
  discountType: string;
  total: number;
  notes: string | null;
  internalNotes: string | null;
  travelTime: number | null;
  mileage: number | null;
  customer: { id: string; name: string; phone: string | null; email: string | null };
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string | null;
    vehicleType: string;
  } | null;
  services: {
    id: string;
    customName: string | null;
    price: number;
    quantity: number;
    serviceItem: { id: string | null; name: string | null; category: string | null };
  }[];
}

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: job,
    isLoading: jobLoading,
    isError,
    refetch,
  } = useQuery<JobDetail>({
    queryKey: ["job", params.id],
    queryFn: () => fetchJson(`/api/jobs/${params.id}`),
  });

  const { data: serviceCatalog = [] } = useQuery<ServiceItem[]>({
    queryKey: ["services"],
    queryFn: () => fetchJson("/api/services?active=true"),
  });

  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState<string>("Richmond");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"dollar" | "percent">("dollar");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [travelTime, setTravelTime] = useState<number>(0);
  const [mileage, setMileage] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (job && !initialized) {
      setSelectedServices(
        job.services.map((s) => ({
          serviceItemId: s.serviceItem?.id || `custom-${Date.now()}-${Math.random()}`,
          name: s.serviceItem?.name || s.customName || "Custom Service",
          price: s.price,
          quantity: s.quantity,
          category: s.serviceItem?.category || "Custom",
        }))
      );
      setScheduledAt(
        job.scheduledAt
          ? new Date(job.scheduledAt).toISOString().slice(0, 16)
          : ""
      );
      setLocation(job.location || "Richmond");
      setAddress(job.address || "");
      setCity(job.city || "");
      setDiscount(job.discount || 0);
      setDiscountType((job.discountType as "dollar" | "percent") || "dollar");
      setNotes(job.notes || "");
      setInternalNotes(job.internalNotes || "");
      setTravelTime(job.travelTime ?? 0);
      setMileage(job.mileage ?? 0);
      setInitialized(true);
    }
  }, [job, initialized]);

  const vehicleType = job?.vehicle?.vehicleType || "Sedan";

  const getPriceForVehicle = (service: ServiceItem, vType: string) => {
    const modifier = service.modifiers.find((m) => m.vehicleType === vType);
    return service.basePrice + (modifier?.priceAdjustment ?? 0);
  };

  const toggleService = (service: ServiceItem) => {
    const existing = selectedServices.find(
      (s) => s.serviceItemId === service.id
    );
    if (existing) {
      setSelectedServices(
        selectedServices.filter((s) => s.serviceItemId !== service.id)
      );
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          serviceItemId: service.id,
          name: service.name,
          price: getPriceForVehicle(service, vehicleType),
          quantity: 1,
          category: service.category,
        },
      ]);
    }
  };

  const updateServicePrice = (serviceItemId: string, price: number) => {
    setSelectedServices(
      selectedServices.map((s) =>
        s.serviceItemId === serviceItemId ? { ...s, price } : s
      )
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
      selectedServices.map((s) =>
        s.serviceItemId === serviceItemId ? { ...s, name } : s
      )
    );
  };

  const subtotal = selectedServices.reduce(
    (sum, s) => sum + s.price * s.quantity,
    0
  );
  const discountAmount =
    discountType === "percent" ? subtotal * (discount / 100) : discount;
  const total = Math.max(0, subtotal - discountAmount);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/jobs/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: selectedServices.map((s) => ({
            serviceItemId: s.serviceItemId.startsWith("custom-") ? undefined : s.serviceItemId,
            name: s.name,
            price: s.price,
            quantity: s.quantity,
          })),
          scheduledAt: scheduledAt || null,
          address,
          city,
          location,
          discount,
          discountType,
          notes,
          internalNotes,
          travelTime: travelTime || null,
          mileage: mileage || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", params.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job updated successfully");
      router.push(`/jobs/${params.id}`);
    },
    onError: () => toast.error("Failed to update job"),
  });

  if (jobLoading) {
    return (
      <div className="p-6">
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError || !job || "error" in (job as object)) {
    return <ErrorState message="Failed to load job." onRetry={refetch} />;
  }

  const coreServices = serviceCatalog.filter((s) => s.category === "Service");
  const addOnServices = serviceCatalog.filter((s) => s.category === "AddOn");

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link
          href={`/jobs/${params.id}`}
          className="hover:text-slate-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Job
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-900">Edit Job</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Job</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer (read-only) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                <div className="font-medium text-slate-900">
                  {job.customer.name}
                </div>
                <div className="text-xs text-slate-500">
                  {job.customer.phone ?? job.customer.email ?? ""}
                </div>
              </div>
              {job.vehicle && (
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <div className="text-sm text-slate-700">
                    {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                    {job.vehicle.color ? ` — ${job.vehicle.color}` : ""}{" "}
                    <span className="text-slate-400">
                      ({job.vehicle.vehicleType})
                    </span>
                  </div>
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
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Core Services
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {coreServices.map((service) => {
                    const price = getPriceForVehicle(service, vehicleType);
                    const selected = selectedServices.some(
                      (s) => s.serviceItemId === service.id
                    );
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

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Add-Ons
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {addOnServices.map((service) => {
                    const price = getPriceForVehicle(service, vehicleType);
                    const selected = selectedServices.some(
                      (s) => s.serviceItemId === service.id
                    );
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
                        <span className="flex-1 text-sm text-slate-700">
                          {s.name}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {s.category}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24 text-right text-sm"
                        value={s.price}
                        onChange={(e) =>
                          updateServicePrice(
                            s.serviceItemId,
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedServices(
                            selectedServices.filter(
                              (x) => x.serviceItemId !== s.serviceItemId
                            )
                          )
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

          {/* Schedule & Location */}
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
                  <Select
                    value={location}
                    onValueChange={(v) => setLocation(v ?? "Richmond")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {LOCATION_LABELS[l]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route & Mileage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Route & Mileage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Travel Time (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={travelTime || ""}
                    onChange={(e) => setTravelTime(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mileage (miles)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={mileage || ""}
                    onChange={(e) => setMileage(parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                  />
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

        {/* Pricing Summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pricing Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {selectedServices.map((s) => (
                  <div
                    key={s.serviceItemId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-slate-600">{s.name}</span>
                    <span className="font-medium">
                      {formatCurrency(s.price)}
                    </span>
                  </div>
                ))}
                {selectedServices.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">
                    No services selected
                  </p>
                )}
              </div>

              {selectedServices.length > 0 && (
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
                      onChange={(e) =>
                        setDiscount(parseFloat(e.target.value) || 0)
                      }
                    />
                    <Select
                      value={discountType}
                      onValueChange={(v) =>
                        setDiscountType(v as "dollar" | "percent")
                      }
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
                disabled={selectedServices.length === 0 || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/jobs/${params.id}`)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
