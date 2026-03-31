"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Car, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { CustomerDetailData } from "./customer-types";

interface CustomerVehiclesProps {
  customerId: string;
  vehicles: CustomerDetailData["vehicles"];
}

export function CustomerVehicles({ customerId, vehicles }: CustomerVehiclesProps) {
  const queryClient = useQueryClient();
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    year: "",
    make: "",
    model: "",
    color: "",
    vehicleType: "Sedan",
    licensePlate: "",
  });

  const addVehicleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/customers/${customerId}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...vehicleForm,
          year: parseInt(vehicleForm.year, 10),
          color: vehicleForm.color || undefined,
          licensePlate: vehicleForm.licensePlate || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      toast.success("Vehicle added");
      setVehicleOpen(false);
      setVehicleForm({ year: "", make: "", model: "", color: "", vehicleType: "Sedan", licensePlate: "" });
    },
    onError: () => toast.error("Failed to add vehicle"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4 text-emerald-500" />
            Vehicles ({vehicles.length})
          </CardTitle>
          <Dialog open={vehicleOpen} onOpenChange={setVehicleOpen}>
            <DialogTrigger render={
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            } />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Vehicle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Year *</Label>
                    <Input
                      type="number"
                      placeholder="2024"
                      value={vehicleForm.year}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Make *</Label>
                    <Input
                      placeholder="Toyota"
                      value={vehicleForm.make}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Model *</Label>
                    <Input
                      placeholder="Camry"
                      value={vehicleForm.model}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Color</Label>
                    <Input
                      placeholder="Black"
                      value={vehicleForm.color}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type *</Label>
                    <Select value={vehicleForm.vehicleType} onValueChange={(v) => setVehicleForm({ ...vehicleForm, vehicleType: v ?? "Sedan" })}>
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
                </div>
                <div className="space-y-1.5">
                  <Label>License Plate</Label>
                  <Input
                    placeholder="ABC-1234"
                    value={vehicleForm.licensePlate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVehicleOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => addVehicleMutation.mutate()}
                  disabled={!vehicleForm.year || !vehicleForm.make || !vehicleForm.model || addVehicleMutation.isPending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {addVehicleMutation.isPending ? "Adding..." : "Add Vehicle"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No vehicles on file</p>
        ) : (
          <div className="space-y-2">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3"
              >
                <div>
                  <span className="font-medium text-slate-900">
                    {v.year} {v.make} {v.model}
                  </span>
                  {v.color && (
                    <span className="text-slate-500 text-sm ml-2">({v.color})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {v.vehicleType}
                  </Badge>
                  {v.licensePlate && (
                    <span className="text-xs text-slate-400 font-mono">
                      {v.licensePlate}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
