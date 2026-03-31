"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { PromoCodeList } from "./components/promo-code-list";
import { PromoCodeFormDialog } from "./components/promo-code-form-dialog";

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
    return c.code.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false);
  });

  const activeCount = codes.filter((c) => c.isActive).length;
  const totalUsed = codes.reduce((s, c) => s + c.usedCount, 0);

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold text-slate-900">{codes.length}</div><div className="text-xs text-slate-500">Total Codes</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold text-emerald-600">{activeCount}</div><div className="text-xs text-slate-500">Active</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold text-slate-900">{totalUsed}</div><div className="text-xs text-slate-500">Total Uses</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold text-slate-900">{codes.length - activeCount}</div><div className="text-xs text-slate-500">Inactive</div></CardContent></Card>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search promo codes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <PromoCodeList
        codes={filtered}
        isLoading={isLoading}
        onEdit={openEdit}
        onToggle={(id, promo) => toggleMutation.mutate({ id, promo })}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <PromoCodeFormDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}
        editingId={editingId}
        code={code}
        setCode={setCode}
        description={description}
        setDescription={setDescription}
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
        minOrderValue={minOrderValue}
        setMinOrderValue={setMinOrderValue}
        maxUses={maxUses}
        setMaxUses={setMaxUses}
        validUntil={validUntil}
        setValidUntil={setValidUntil}
        isActive={isActive}
        setIsActive={setIsActive}
        onSave={() => saveMutation.mutate()}
        onCancel={() => { setDialogOpen(false); resetForm(); }}
        isPending={saveMutation.isPending}
      />
    </div>
  );
}
