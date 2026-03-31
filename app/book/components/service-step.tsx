"use client";

import { CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceOption } from "./types";

interface ServiceStepProps {
  servicesByCategory: Record<string, ServiceOption[]>;
  selectedServices: string[];
  vehicleSize: string;
  getServicePrice: (service: ServiceOption) => number;
  onToggle: (id: string) => void;
}

export function ServiceStep({
  servicesByCategory,
  selectedServices,
  vehicleSize: _vehicleSize,
  getServicePrice,
  onToggle,
}: ServiceStepProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Select Services</h2>
      <p className="text-sm text-slate-500 mb-5">
        Choose the services you&apos;d like for your vehicle
      </p>
      {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
        <div key={category} className="mb-6 last:mb-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
            {category}
          </h3>
          <div className="space-y-2">
            {categoryServices.map((service) => {
              const price = getServicePrice(service);
              const isSelected = selectedServices.includes(service.id);
              return (
                <button
                  key={service.id}
                  onClick={() => onToggle(service.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all",
                    isSelected
                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-900">{service.name}</div>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      {service.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      {service.estimatedMinutes && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{service.estimatedMinutes} min
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <span
                        className={cn(
                          "text-lg font-bold",
                          isSelected ? "text-emerald-600" : "text-slate-900"
                        )}
                      >
                        ${price.toFixed(0)}
                      </span>
                      {price !== service.basePrice && (
                        <div className="text-[10px] text-slate-400 line-through">
                          ${service.basePrice.toFixed(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
