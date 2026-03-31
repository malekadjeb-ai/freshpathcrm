"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit2, Archive, DollarSign } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchJson, formatCurrency } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { ServiceForm } from "./components/service-form";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  category: string;
  isActive: boolean;
  modifiers: { id: string; vehicleType: string; priceAdjustment: number }[];
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
