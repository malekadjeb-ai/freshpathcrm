"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/error-state";
import { fetchJson } from "@/lib/utils";
import { toast } from "sonner";
import { FleetCustomer, FleetContract, ContractFormData } from "@/components/fleet/types";
import { FleetStats } from "@/components/fleet/fleet-stats";
import { FleetAccountList } from "@/components/fleet/fleet-account-list";
import { ContractList } from "@/components/fleet/contract-list";
import { ContractDialog } from "@/components/fleet/contract-dialog";

const EMPTY_FORM: ContractFormData = {
  customerId: "",
  name: "",
  frequency: "monthly",
  pricePerVehicle: "",
  flatRate: "",
  vehicleCount: "",
  startDate: "",
  endDate: "",
  notes: "",
};

export default function FleetPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [contractDialog, setContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<FleetContract | null>(null);
  const [contractForm, setContractForm] = useState<ContractFormData>(EMPTY_FORM);

  const { data: fleetCustomers = [], isLoading, isError, refetch } = useQuery<FleetCustomer[]>({
    queryKey: ["fleet-customers"],
    queryFn: () => fetchJson("/api/customers?commercial=true"),
  });

  const { data: contracts = [] } = useQuery<FleetContract[]>({
    queryKey: ["fleet-contracts"],
    queryFn: () => fetchJson("/api/fleet-contracts"),
  });

  const contractMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = editingContract
        ? `/api/fleet-contracts/${editingContract.id}`
        : "/api/fleet-contracts";
      const res = await fetch(url, {
        method: editingContract ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fleet-contracts"] });
      toast.success(editingContract ? "Contract updated" : "Contract created");
      closeContractDialog();
    },
    onError: () => toast.error("Failed to save contract"),
  });

  const deleteContractMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/fleet-contracts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fleet-contracts"] });
      toast.success("Contract deleted");
    },
  });

  function openNewContract() {
    setEditingContract(null);
    setContractForm({
      ...EMPTY_FORM,
      startDate: new Date().toISOString().slice(0, 10),
    });
    setContractDialog(true);
  }

  function openEditContract(c: FleetContract) {
    setEditingContract(c);
    setContractForm({
      customerId: c.customerId,
      name: c.name,
      frequency: c.frequency,
      pricePerVehicle: c.pricePerVehicle?.toString() || "",
      flatRate: c.flatRate?.toString() || "",
      vehicleCount: c.vehicleCount.toString(),
      startDate: c.startDate ? c.startDate.slice(0, 10) : "",
      endDate: c.endDate ? c.endDate.slice(0, 10) : "",
      notes: c.notes || "",
    });
    setContractDialog(true);
  }

  function closeContractDialog() {
    setContractDialog(false);
    setEditingContract(null);
  }

  function handleSaveContract() {
    contractMutation.mutate({
      customerId: contractForm.customerId,
      name: contractForm.name,
      frequency: contractForm.frequency,
      pricePerVehicle: contractForm.pricePerVehicle ? parseFloat(contractForm.pricePerVehicle) : null,
      flatRate: contractForm.flatRate ? parseFloat(contractForm.flatRate) : null,
      vehicleCount: parseInt(contractForm.vehicleCount || "0"),
      startDate: contractForm.startDate,
      endDate: contractForm.endDate || null,
      notes: contractForm.notes || undefined,
    });
  }

  const filtered = fleetCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.companyName || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalFleetVehicles = fleetCustomers.reduce((s, c) => s + (c.fleetSize || c.vehicles.length), 0);
  const totalFleetRevenue = fleetCustomers.reduce((s, c) => s + c.totalSpent, 0);
  const activeContracts = contracts.filter((c) => c.isActive).length;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fleet & Commercial</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage fleet accounts and service contracts
          </p>
        </div>
        <Button onClick={openNewContract}>
          <Plus className="w-4 h-4 mr-2" /> New Contract
        </Button>
      </div>

      {isError && <ErrorState message="Failed to load fleet accounts." onRetry={refetch} />}

      <FleetStats
        accountCount={fleetCustomers.length}
        totalVehicles={totalFleetVehicles}
        activeContracts={activeContracts}
        totalRevenue={totalFleetRevenue}
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search fleet accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FleetAccountList customers={filtered} isLoading={isLoading} />
        <ContractList
          contracts={contracts}
          onEdit={openEditContract}
          onDelete={(id) => deleteContractMutation.mutate(id)}
        />
      </div>

      <ContractDialog
        open={contractDialog}
        onOpenChange={(open) => { if (!open) closeContractDialog(); else setContractDialog(true); }}
        editingContract={editingContract}
        form={contractForm}
        onFormChange={setContractForm}
        onSave={handleSaveContract}
        isSaving={contractMutation.isPending}
        fleetCustomers={fleetCustomers}
      />
    </div>
  );
}
