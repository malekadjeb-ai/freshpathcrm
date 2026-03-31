"use client";

import { Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export interface ServiceItem {
  id: string;
  name: string;
  basePrice: number;
  category: string;
  isActive: boolean;
  modifiers: { vehicleType: string; priceAdjustment: number }[];
}

export interface SelectedService {
  serviceItemId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export function ServiceSelector({
  services,
  selectedServices,
  selectedVehicleType,
  onToggleService,
  onUpdatePrice,
  onUpdateName,
  onRemoveService,
  onAddCustom,
}: {
  services: ServiceItem[];
  selectedServices: SelectedService[];
  selectedVehicleType: string;
  onToggleService: (service: ServiceItem) => void;
  onUpdatePrice: (serviceItemId: string, price: number) => void;
  onUpdateName: (serviceItemId: string, name: string) => void;
  onRemoveService: (serviceItemId: string) => void;
  onAddCustom: () => void;
}) {
  const getPriceForVehicle = (service: ServiceItem, vehicleType: string) => {
    const modifier = service.modifiers.find((m) => m.vehicleType === vehicleType);
    return service.basePrice + (modifier?.priceAdjustment ?? 0);
  };

  const coreServices = services.filter((s) => s.category === "Service");
  const addOnServices = services.filter((s) => s.category === "AddOn");

  return (
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
                  onClick={() => onToggleService(service)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="font-medium text-sm text-slate-900">{service.name}</div>
                  <div className="text-emerald-600 text-sm font-semibold mt-0.5">{formatCurrency(price)}</div>
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
                  onClick={() => onToggleService(service)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="font-medium text-sm text-slate-900">{service.name}</div>
                  <div className="text-emerald-600 text-sm font-semibold mt-0.5">{formatCurrency(price)}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onAddCustom}
          className="mt-3 w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add Custom Service</span>
        </button>

        {selectedServices.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Selected Services</p>
            {selectedServices.map((s) => (
              <div key={s.serviceItemId} className="flex items-center gap-3">
                {s.category === "Custom" ? (
                  <Input
                    type="text"
                    placeholder="Service name..."
                    className="flex-1 text-sm"
                    value={s.name}
                    onChange={(e) => onUpdateName(s.serviceItemId, e.target.value)}
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
                  onChange={(e) => onUpdatePrice(s.serviceItemId, parseFloat(e.target.value) || 0)}
                />
                <button
                  type="button"
                  onClick={() => onRemoveService(s.serviceItemId)}
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
  );
}
