"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Building2,
  Search,
  Plus,
  Car,
  FileText,
  Calendar,
  Percent,
  Trash2,
  Edit2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { toast } from "sonner";

interface FleetCustomer {
  id: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  fleetSize: number | null;
  fleetDiscount: number | null;
  paymentTerms: string | null;
  vehicles: { id: string }[];
  totalSpent: number;
  jobCount: number;
}

interface FleetContract {
  id: string;
  customerId: string;
  customer: { id: string; name: string; companyName: string | null };
  name: string;
  frequency: string;
  pricePerVehicle: number | null;
  flatRate: number | null;
  vehicleCount: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

const TERMS_LABELS: Record<string, string> = {
  due_on_receipt: "Due on Receipt",
  net_15: "Net 15",
  net_30: "Net 30",
  net_60: "Net 60",
};

export default function FleetPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [contractDialog, setContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<FleetContract | null>(null);

  // Contract form
  const [contractForm, setContractForm] = useState({
    customerId: "",
    name: "",
    frequency: "monthly",
    pricePerVehicle: "",
    flatRate: "",
    vehicleCount: "",
    startDate: "",
    endDate: "",
    notes: "",
  });

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
      customerId: "",
      name: "",
      frequency: "monthly",
      pricePerVehicle: "",
      flatRate: "",
      vehicleCount: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      notes: "",
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{fleetCustomers.length}</div>
            <div className="text-xs text-slate-500 mt-1">Fleet Accounts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{totalFleetVehicles}</div>
            <div className="text-xs text-slate-500 mt-1">Total Fleet Vehicles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{activeContracts}</div>
            <div className="text-xs text-slate-500 mt-1">Active Contracts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalFleetRevenue)}</div>
            <div className="text-xs text-slate-500 mt-1">Fleet Revenue</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
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
        {/* Fleet Accounts */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Fleet Accounts ({filtered.length})
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-1">No fleet accounts yet</p>
                <p className="text-xs text-slate-400">
                  Mark customers as &quot;Fleet / Commercial&quot; in their profile
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => (
                <Link key={c.id} href={`/customers/${c.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{c.companyName || c.name}</span>
                            <Badge className="bg-blue-100 text-blue-700 text-[10px]">Fleet</Badge>
                          </div>
                          {c.companyName && c.companyName !== c.name && (
                            <p className="text-xs text-slate-500">{c.name}</p>
                          )}
                          <div className="flex gap-3 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              {c.fleetSize || c.vehicles.length} vehicles
                            </span>
                            {c.fleetDiscount != null && c.fleetDiscount > 0 && (
                              <span className="flex items-center gap-1">
                                <Percent className="w-3 h-3" />
                                {c.fleetDiscount}% discount
                              </span>
                            )}
                            {c.paymentTerms && (
                              <span>{TERMS_LABELS[c.paymentTerms] || c.paymentTerms}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-emerald-600">{formatCurrency(c.totalSpent)}</div>
                          <div className="text-xs text-slate-400">{c.jobCount} jobs</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Contracts */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Service Contracts ({contracts.length})
          </h2>
          {contracts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-1">No contracts yet</p>
                <p className="text-xs text-slate-400">
                  Create service contracts for recurring fleet work
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {contracts.map((c) => (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900 truncate">{c.name}</span>
                          <Badge className={c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                            {c.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {c.customer.companyName || c.customer.name}
                        </p>
                        <div className="flex gap-3 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {FREQUENCY_LABELS[c.frequency] || c.frequency}
                          </span>
                          <span>
                            {c.vehicleCount} vehicles
                          </span>
                          {c.pricePerVehicle != null && (
                            <span>{formatCurrency(c.pricePerVehicle)}/vehicle</span>
                          )}
                          {c.flatRate != null && (
                            <span>{formatCurrency(c.flatRate)} flat</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Started {formatDate(c.startDate)}
                          {c.endDate && ` · Ends ${formatDate(c.endDate)}`}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditContract(c)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={
                            <Button variant="ghost" size="sm" className="text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          } />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Contract</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete &quot;{c.name}&quot;? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteContractMutation.mutate(c.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contract Dialog */}
      <Dialog open={contractDialog} onOpenChange={setContractDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContract ? "Edit Contract" : "New Service Contract"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {!editingContract && (
              <div>
                <Label>Fleet Account</Label>
                <Select
                  value={contractForm.customerId || "none"}
                  onValueChange={(v) => {
                    const val = String(v ?? "");
                    setContractForm((p) => ({ ...p, customerId: val === "none" ? "" : val }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Select account</SelectItem>
                    {fleetCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.companyName || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Contract Name</Label>
              <Input
                value={contractForm.name}
                onChange={(e) => setContractForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Monthly Fleet Wash Package"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Frequency</Label>
                <Select
                  value={contractForm.frequency}
                  onValueChange={(v) => setContractForm((p) => ({ ...p, frequency: String(v ?? "monthly") }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vehicle Count</Label>
                <Input
                  type="number"
                  min="0"
                  value={contractForm.vehicleCount}
                  onChange={(e) => setContractForm((p) => ({ ...p, vehicleCount: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price Per Vehicle</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={contractForm.pricePerVehicle}
                  onChange={(e) => setContractForm((p) => ({ ...p, pricePerVehicle: e.target.value }))}
                  placeholder="$0.00"
                />
              </div>
              <div>
                <Label>Or Flat Rate</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={contractForm.flatRate}
                  onChange={(e) => setContractForm((p) => ({ ...p, flatRate: e.target.value }))}
                  placeholder="$0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={contractForm.startDate}
                  onChange={(e) => setContractForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={contractForm.endDate}
                  onChange={(e) => setContractForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={contractForm.notes}
                onChange={(e) => setContractForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Contract terms, special pricing..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeContractDialog}>Cancel</Button>
            <Button
              onClick={handleSaveContract}
              disabled={!contractForm.name || (!editingContract && !contractForm.customerId) || contractMutation.isPending}
            >
              {contractMutation.isPending ? "Saving..." : editingContract ? "Update" : "Create Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
