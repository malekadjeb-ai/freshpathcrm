"use client";

import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ServiceItem {
  id: string;
  name: string;
  basePrice: number;
  category: string;
  isActive: boolean;
  modifiers: { vehicleType: string; priceAdjustment: number }[];
}

interface LineItem {
  key: string;
  serviceId: string | null;
  name: string;
  description: string;
  price: number;
  quantity: number;
}

interface LineItemsCardProps {
  services: ServiceItem[];
  lineItems: LineItem[];
  vehicleType: string;
  getPriceForVehicle: (service: ServiceItem, vType: string) => number;
  addServiceItem: (service: ServiceItem) => void;
  addCustomItem: () => void;
  updateLineItem: (key: string, field: string, value: string | number) => void;
  removeLineItem: (key: string) => void;
}

export function LineItemsCard({
  services,
  lineItems,
  vehicleType,
  getPriceForVehicle,
  addServiceItem,
  addCustomItem,
  updateLineItem,
  removeLineItem,
}: LineItemsCardProps) {
  return (
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
  );
}
