"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { paymentSchema, PaymentInput } from "@/lib/validations/invoice";
import { PAYMENT_METHODS } from "@/lib/utils";
import { format } from "date-fns";

interface PaymentDialogProps {
  invoiceId: string;
  remaining: number;
  onClose: () => void;
}

export function PaymentDialog({ invoiceId, remaining, onClose }: PaymentDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId,
      amount: remaining,
      method: "Zelle",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PaymentInput) => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment recorded");
      onClose();
    },
    onError: () => toast.error("Failed to record payment"),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Amount ($)</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          {...register("amount", { valueAsNumber: true })}
        />
        {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Payment Method</Label>
        <Select defaultValue="Zelle" onValueChange={(v) => setValue("method", v as PaymentInput["method"])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Payment Date</Label>
        <Input type="date" {...register("paymentDate")} />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
        >
          {mutation.isPending ? "Recording..." : "Record Payment"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
