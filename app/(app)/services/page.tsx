"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit2, Archive, DollarSign } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { serviceItemSchema, ServiceItemInput } from "@/lib/validations/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { fetchJson, formatCurrency } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  category: string;
  isActive: boolean;
  modifiers: { id: string; vehicleType: string; priceAdjustment: number }[];
}

const VEHICLE_TYPES = ["SUV", "Truck", "Van", "Luxury"];

function ServiceForm({
  service,
  onClose,
}: {
  service?: ServiceItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [modifiers, setModifiers] = useState(
    service?.modifiers ?? []
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceItemInput>({
    resolver: zodResolver(serviceItemSchema),
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      basePrice: service?.basePrice ?? 0,
      supplyCost: (service as unknown as Record<string, unknown>)?.supplyCost as number ?? 0,
      category: (service?.category as "Service" | "AddOn") ?? "Service",
      isActive: service?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ServiceItemInput) => {
      const url = service ? `/api/services/${service.id}` : "/api/services";
      const method = service ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, modifiers }),
      });
      if (!res.ok) throw new Error("Failed to save service");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success(service ? "Service updated" : "Service created");
      onClose();
    },
    onError: () => toast.error("Failed to save service"),
  });

  const addModifier = () => {
    setModifiers([...modifiers, { id: "", vehicleType: "SUV", priceAdjustment: 30 }]);
  };

  const updateModifier = (index: number, field: string, value: string | number) => {
    setModifiers(modifiers.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const removeModifier = (index: number) => {
    setModifiers(modifiers.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate({ ...d, isActive: d.isActive ?? true }))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-2">
          <Label>Service Name</Label>
          <Input {...register("name")} placeholder="e.g. Full Detail" />
          {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            defaultValue={service?.category ?? "Service"}
            onValueChange={(v) => setValue("category", v as "Service" | "AddOn")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Service">Service</SelectItem>
              <SelectItem value="AddOn">Add-On</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Base Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register("basePrice", { valueAsNumber: true })}
          />
          {errors.basePrice && <p className="text-red-500 text-xs">{errors.basePrice.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Supply Cost ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register("supplyCost", { valueAsNumber: true })}
          />
          <p className="text-xs text-slate-400">Auto-logged as expense per job</p>
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label>Description</Label>
          <Textarea
            {...register("description")}
            placeholder="Optional description..."
            rows={2}
          />
        </div>

        <div className="flex items-center gap-2 col-span-2">
          <Switch
            checked={watch("isActive")}
            onCheckedChange={(v) => setValue("isActive", v)}
          />
          <Label>Active</Label>
        </div>
      </div>

      {/* Vehicle type modifiers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Vehicle Type Pricing</Label>
          <Button type="button" size="sm" variant="outline" onClick={addModifier}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Modifier
          </Button>
        </div>
        <div className="text-xs text-slate-500 mb-2">Sedan is the base price. Add adjustments for other types.</div>
        {modifiers.map((mod, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Select
              value={mod.vehicleType}
              onValueChange={(v) => updateModifier(i, "vehicleType", v ?? "SUV")}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-slate-500 text-sm">+$</span>
            <Input
              type="number"
              className="w-24"
              value={mod.priceAdjustment}
              onChange={(e) => updateModifier(i, "priceAdjustment", parseFloat(e.target.value))}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-red-500"
              onClick={() => removeModifier(i)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          {mutation.isPending ? "Saving..." : service ? "Update Service" : "Create Service"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function ServicesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editService, setEditService] = useState<ServiceItem | null>(null);

  const { data: services = [], isLoading, isError, refetch } = useQuery<ServiceItem[]>({
    queryKey: ["services"],
    queryFn: () => fetchJson("/api/services"),
  });

  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service archived");
    },
    onError: () => toast.error("Failed to archive service"),
  });

  const coreServices = services.filter((s) => s.category === "Service");
  const addOns = services.filter((s) => s.category === "AddOn");

  const ServiceCard = ({ service }: { service: ServiceItem }) => (
    <Card className={`border ${!service.isActive ? "opacity-50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{service.name}</span>
              {!service.isActive && (
                <Badge variant="secondary" className="text-xs">Archived</Badge>
              )}
            </div>
            {service.description && (
              <p className="text-sm text-slate-500 mt-0.5">{service.description}</p>
            )}
            <div className="flex items-center gap-1 mt-2">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold text-emerald-600">{formatCurrency(service.basePrice)}</span>
              <span className="text-xs text-slate-400 ml-1">base (Sedan)</span>
            </div>
            {service.modifiers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {service.modifiers.map((m) => (
                  <span
                    key={m.id}
                    className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                  >
                    {m.vehicleType}: {formatCurrency(service.basePrice + m.priceAdjustment)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => {
                setEditService(service);
                setDialogOpen(true);
              }}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            {service.isActive && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive Service</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to archive &ldquo;{service.name}&rdquo;? It will no longer appear in new jobs.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => archiveMutation.mutate(service.id)}
                    >
                      Archive
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Catalog</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your services and add-ons</p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={() => {
            setEditService(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Service
        </Button>
      </div>

      {isError ? <ErrorState message="Failed to load services." onRetry={refetch} /> :
      <Tabs defaultValue="services">
        <TabsList className="mb-4">
          <TabsTrigger value="services">Services ({coreServices.length})</TabsTrigger>
          <TabsTrigger value="addons">Add-Ons ({addOns.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : coreServices.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No services yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coreServices.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="addons">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : addOns.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No add-ons yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addOns.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editService ? "Edit Service" : "New Service"}</DialogTitle>
          </DialogHeader>
          <ServiceForm
            service={editService}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
