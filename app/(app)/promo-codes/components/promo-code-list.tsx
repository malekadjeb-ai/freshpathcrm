"use client";

import { Tag, Trash2, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

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

interface PromoCodeListProps {
  codes: PromoCodeData[];
  isLoading: boolean;
  onEdit: (promo: PromoCodeData) => void;
  onToggle: (id: string, promo: PromoCodeData) => void;
  onDelete: (id: string) => void;
}

export function PromoCodeList({ codes, isLoading, onEdit, onToggle, onDelete }: PromoCodeListProps) {
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (codes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-600 mb-1">No promo codes</h3>
          <p className="text-sm text-slate-400">Create your first promo code to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {codes.map((promo) => {
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
                    onCheckedChange={() => onToggle(promo.id, promo)}
                  />
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onEdit(promo)}>
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
                          onClick={() => onDelete(promo.id)}
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
  );
}
