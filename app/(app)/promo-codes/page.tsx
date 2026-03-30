"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Tag, Plus, Search, Trash2, Pencil, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface PromoCodeData {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderValue: number | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function PromoCodesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"dollar" | "percent">("dollar");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [minOrderValue, setMinOrderValue] = useState<number>(0);
  const [maxUses, setMaxUses] = useState<number>(0);
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: codes = [], isLoading, isError, refetch } = useQuery<PromoCodeData[]>({
    queryKey: ["promo-codes"],
    queryFn: () => fetchJson("/api/promo-codes"),
  });

  const resetForm = () => {
    setCode("");
    setDescription("");
    setDiscountType("dollar");
    setDiscountValue(0);
    setMinOrderValue(0);
    setMaxUses(0);
    setValidUntil("");
    setIsActive(true);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (promo: PromoCodeData) => {
    setEditingId(promo.id);
    setCode(promo.code);
    setDescription(promo.description || "");
    setDiscountType(promo.discountType as "dollar" | "percent");
    setDiscountValue(promo.discountValue);
    setMinOrderValue(promo.minOrderValue ?? 0);
    setMaxUses(promo.maxUses ?? 0);
    setValidUntil(promo.validUntil ? new Date(promo.validUntil).toISOString().slice(0, 10) : "");
    setIsActive(promo.isActive);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code,
        description: description || undefined,
        discountType,
        discountValue,
        minOrderValue: minOrderValue || null,
        maxUses: maxUses || null,
        validUntil: validUntil || null,
        isActive,
      };
      const url = editingId ? `/api/promo-codes/${editingId}` : "/api/promo-codes";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      toast.success(editingId ? "Promo code updated" : "Promo code created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/promo-codes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      toast.success("Promo code deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, promo }: { id: string; promo: PromoCodeData }) => {
      const res = await fetch(`/api/promo-codes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promo.code,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          isActive: !promo.isActive,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const filtered = codes.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    );
  });

  const activeCount = codes.filter((c) => c.isActive).length;
  const totalUsed = codes.reduce((s, c) => s + c.usedCount, 0);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promo Codes</h1>
          <p className="text-sm text-slate-500 mt-1">Manage discount codes for jobs and bookings</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Promo Code
        </Button>
      </div>

      {isError && <ErrorState message="Failed to load promo codes." onRetry={refetch} />}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-slate-900">{codes.length}</div>
            <div className="text-xs text-slate-500">Total Codes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
            <div className="text-xs text-slate-500">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-slate-900">{totalUsed}</div>
            <div className="text-xs text-slate-500">Total Uses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-slate-900">{codes.length - activeCount}</div>
            <div className="text-xs text-slate-500">Inactive</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search promo codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-medium text-slate-600 mb-1">No promo codes</h3>
            <p className="text-sm text-slate-400">Create your first promo code to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((promo) => {
            const isExpired = promo.validUntil && new Date(promo.validUntil) < new Date();
            const isMaxed = promo.maxUses != null && promo.usedCount >= promo.maxUses;
            return (
              <Card key={promo.id}>
                <CardContent className="py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <code className="text-lg font-bold text-slate-900 tracking-wide">{promo.code}</code>
                        <button onClick={() => copyCode(promo.code)} className="text-slate-400 hover:text-emerald-500">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Badge className={promo.isActive && !isExpired && !isMaxed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                      }>
                        {!promo.isActive ? "Inactive" : isExpired ? "Expired" : isMaxed ? "Maxed Out" : "Active"}
                      </Badge>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-emerald-600">
                          {promo.discountType === "percent"
                            ? `${promo.discountValue}% off`
                            : `${formatCurrency(promo.discountValue)} off`}
                        </span>
                        {promo.minOrderValue != null && promo.minOrderValue > 0 && (
                          <span className="text-slate-400">
                            min {formatCurrency(promo.minOrderValue)}
                          </span>
                        )}
                      </div>
                      {promo.description && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{promo.description}</p>
                      )}
                      <div className="flex gap-3 mt-1 text-xs text-slate-400">
                        <span>{promo.usedCount}{promo.maxUses ? `/${promo.maxUses}` : ""} uses</span>
                        {promo.validUntil && (
                          <span>Expires: {formatDate(promo.validUntil)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={promo.isActive}
                        onCheckedChange={() => toggleMutation.mutate({ id: promo.id, promo })}
                      />
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(promo)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger render={
                          <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        } />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete promo code?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the promo code &quot;{promo.code}&quot;.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-500 hover:bg-red-600"
                              onClick={() => deleteMutation.mutate(promo.id)}
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
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SUMMER25"
                className="uppercase font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Summer 2026 promotion..."
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Discount Type</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType((v ?? "dollar") as "dollar" | "percent")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dollar">Dollar ($)</SelectItem>
                    <SelectItem value="percent">Percent (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder={discountType === "percent" ? "25" : "10.00"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Order Value</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minOrderValue || ""}
                  onChange={(e) => setMinOrderValue(parseFloat(e.target.value) || 0)}
                  placeholder="0.00 (no minimum)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Uses</Label>
                <Input
                  type="number"
                  min="0"
                  value={maxUses || ""}
                  onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expires On</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label className="text-sm">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !code || !discountValue}
            >
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
