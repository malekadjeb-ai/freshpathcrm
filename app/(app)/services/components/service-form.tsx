"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { serviceItemSchema, ServiceItemInput } from "@/lib/validations/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

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

export function ServiceForm({
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
