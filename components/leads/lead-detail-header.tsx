"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Phone, Mail, ChevronRight, Trash2, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import type { LeadDetail } from "./lead-types";
import { STATUS_COLORS } from "./lead-types";

interface LeadDetailHeaderProps {
  lead: LeadDetail;
}

export function LeadDetailHeader({ lead }: LeadDetailHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isConverted = lead.status === "Won" || lead.status === "Booked" || !!lead.customerId;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Lead deleted");
      router.push("/leads");
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${lead.id}/convert`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      toast.success("Lead converted to customer!");
      router.push(`/customers/${data.customerId || data.id}`);
    },
    onError: () => toast.error("Failed to convert lead"),
  });

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/leads" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Leads
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{lead.name}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-slate-900">{lead.name}</h1>
              <Badge className={cn("text-xs", STATUS_COLORS[lead.status])}>{lead.status}</Badge>
              <Badge variant="outline" className="text-xs">{lead.source}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-emerald-600">
                  <Phone className="w-3.5 h-3.5" /> {lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-emerald-600">
                  <Mail className="w-3.5 h-3.5" /> {lead.email}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isConverted && (
              <AlertDialog>
                <AlertDialogTrigger render={
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                    <UserPlus className="w-4 h-4" /> Convert to Customer
                  </Button>
                } />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Convert Lead to Customer</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will create a new customer record from {lead.name}&apos;s info and mark this lead as Won.
                      {lead.vehicleInfo && " A vehicle record will also be created."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => convertMutation.mutate()}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      Convert
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {isConverted && lead.customer && (
              <Link href={`/customers/${lead.customer.id}`}>
                <Button variant="outline" className="gap-1">
                  <User className="w-4 h-4" /> View Customer
                </Button>
              </Link>
            )}
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="outline" className="text-red-500 hover:text-red-700 gap-1">
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete this lead and all related activities.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </>
  );
}
