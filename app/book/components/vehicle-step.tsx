"use client";

import { Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VEHICLE_SIZES, VEHICLE_MAKES, YEARS } from "./types";
import type { ServiceOption, BookingForm } from "./types";

interface VehicleStepProps {
  form: BookingForm;
  vehicleSize: string;
  selectedServicesList: ServiceOption[];
  getServicePrice: (service: ServiceOption) => number;
  onVehicleSizeChange: (size: string) => void;
  onFormChange: (patch: Partial<BookingForm>) => void;
}

export function VehicleStep({
  form,
  vehicleSize,
  selectedServicesList,
  getServicePrice,
  onVehicleSizeChange,
  onFormChange,
}: VehicleStepProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Vehicle Information</h2>
      <p className="text-sm text-slate-500 mb-5">
        Select your vehicle size to get accurate pricing
      </p>

      <div className="mb-6">
        <Label className="text-sm font-semibold text-slate-700 mb-3 block">Vehicle Size</Label>
        <div className="grid grid-cols-3 gap-2">
          {VEHICLE_SIZES.map((size) => (
            <button
              key={size.value}
              onClick={() => onVehicleSizeChange(size.value)}
              className={cn(
                "p-3 rounded-xl border-2 transition-all text-center",
                vehicleSize === size.value
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-100 hover:border-slate-200"
              )}
            >
              <div className="text-2xl mb-1">{size.icon}</div>
              <div
                className={cn(
                  "text-sm font-medium",
                  vehicleSize === size.value ? "text-emerald-700" : "text-slate-700"
                )}
              >
                {size.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-600">Year</Label>
            <select
              value={form.vehicleYear}
              onChange={(e) => onFormChange({ vehicleYear: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="">Select year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-slate-600">Make</Label>
            <select
              value={form.vehicleMake}
              onChange={(e) => onFormChange({ vehicleMake: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="">Select make</option>
              {VEHICLE_MAKES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-600">Model</Label>
            <Input
              value={form.vehicleModel}
              onChange={(e) => onFormChange({ vehicleModel: e.target.value })}
              className="mt-1"
              placeholder="e.g. Camry"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-600">Color</Label>
            <Input
              value={form.vehicleColor}
              onChange={(e) => onFormChange({ vehicleColor: e.target.value })}
              className="mt-1"
              placeholder="e.g. White"
            />
          </div>
        </div>
      </div>

      {selectedServicesList.length > 0 && (
        <div className="mt-5 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm">
          <div className="flex items-center gap-2 text-emerald-700 font-medium">
            <Sparkles className="w-4 h-4" />
            Updated pricing for {vehicleSize}
          </div>
          <div className="text-emerald-600 text-xs mt-1">
            {selectedServicesList.map((s) => (
              <span key={s.id} className="mr-3">
                {s.name}: ${getServicePrice(s).toFixed(0)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
