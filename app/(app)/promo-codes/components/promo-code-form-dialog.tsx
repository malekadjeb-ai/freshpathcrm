"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface PromoCodeFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingId: string | null;
  code: string;
  setCode: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  discountType: "dollar" | "percent";
  setDiscountType: (v: "dollar" | "percent") => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;
  minOrderValue: number;
  setMinOrderValue: (v: number) => void;
  maxUses: number;
  setMaxUses: (v: number) => void;
  validUntil: string;
  setValidUntil: (v: string) => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function PromoCodeFormDialog({
  open,
  onOpenChange,
  editingId,
  code,
  setCode,
  description,
  setDescription,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  minOrderValue,
  setMinOrderValue,
  maxUses,
  setMaxUses,
  validUntil,
  setValidUntil,
  isActive,
  setIsActive,
  onSave,
  onCancel,
  isPending,
}: PromoCodeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={onSave}
            disabled={isPending || !code || !discountValue}
          >
            {isPending ? "Saving..." : editingId ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
