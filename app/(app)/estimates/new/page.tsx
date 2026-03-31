"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchJson } from "@/lib/utils";
import { CustomerSelector } from "./components/customer-selector";
import { LineItemsCard } from "./components/line-items-card";
import { EstimateSummary } from "./components/estimate-summary";

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
          <CustomerSelector
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            selectedCustomerId={selectedCustomerId}
            setSelectedCustomerId={setSelectedCustomerId}
            selectedVehicleId={selectedVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
            customers={customers}
            selectedCustomer={selectedCustomer}
          />

          <LineItemsCard
            services={services}
            lineItems={lineItems}
            vehicleType={vehicleType}
            getPriceForVehicle={getPriceForVehicle}
            addServiceItem={addServiceItem}
            addCustomItem={addCustomItem}
            updateLineItem={updateLineItem}
            removeLineItem={removeLineItem}
          />

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

        <div>
          <EstimateSummary
            lineItems={lineItems}
            subtotal={subtotal}
            total={total}
            discount={discount}
            setDiscount={setDiscount}
            canSubmit={!!canSubmit}
            isPending={mutation.isPending}
            onSubmit={() => mutation.mutate()}
          />
        </div>
      </div>
    </div>
  );
}
