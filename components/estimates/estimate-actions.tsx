"use client";

import { UseMutationResult } from "@tanstack/react-query";
import Link from "next/link";
import {
  Send, CheckCircle, XCircle, ArrowRightCircle, Trash2, Download, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface EstimateForActions {
  id: string;
  estimateNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  total: number;
  notes: string | null;
  validUntil: string | null;
  createdAt: string;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    zip: string | null;
  };
  vehicle: { make: string; model: string; year: number; color: string | null } | null;
  lineItems: { id: string; name: string; description: string | null; price: number; quantity: number }[];
  convertedJob: { id: string; status: string } | null;
}

export function EstimateActions({
  estimate,
  statusMutation,
  convertMutation,
  deleteMutation,
  onSendClick,
  onFollowUpClick,
}: {
  estimate: EstimateForActions;
  statusMutation: UseMutationResult<unknown, Error, string>;
  convertMutation: UseMutationResult<unknown, Error, void>;
  deleteMutation: UseMutationResult<unknown, Error, void>;
  onSendClick: () => void;
  onFollowUpClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        onClick={async () => {
          try {
            const [{ pdf }, { EstimatePDF: EstimatePDFComponent }] = await Promise.all([
              import("@react-pdf/renderer"),
              import("@/components/estimate-pdf"),
            ]);
            const blob = await pdf(
              <EstimatePDFComponent estimate={estimate} settings={null} />
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${estimate.estimateNumber}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
          } catch {
            toast.error("Failed to generate PDF");
          }
        }}
      >
        <Download className="w-4 h-4 mr-2" />
        Download PDF
      </Button>

      {estimate.status === "Draft" && (
        <>
          <Button variant="outline" onClick={onSendClick}>
            <Send className="w-4 h-4 mr-2" />
            Send to Customer
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button variant="outline" size="icon" className="text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            } />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete estimate?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete this estimate.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => deleteMutation.mutate()}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {estimate.status === "Sent" && (
        <>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => statusMutation.mutate("Approved")} disabled={statusMutation.isPending}>
            <CheckCircle className="w-4 h-4 mr-2" /> Mark Approved
          </Button>
          <Button variant="outline" onClick={() => statusMutation.mutate("Declined")} disabled={statusMutation.isPending}>
            <XCircle className="w-4 h-4 mr-2" /> Mark Declined
          </Button>
          <Button variant="outline" onClick={onFollowUpClick}>
            <RefreshCw className="w-4 h-4 mr-2" /> Follow Up
          </Button>
        </>
      )}

      {estimate.status === "Approved" && (
        <Button className="bg-purple-500 hover:bg-purple-600 text-white" onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
          <ArrowRightCircle className="w-4 h-4 mr-2" />
          {convertMutation.isPending ? "Converting..." : "Convert to Job"}
        </Button>
      )}

      {estimate.status === "Converted" && estimate.convertedJob && (
        <Link href={`/jobs/${estimate.convertedJob.id}`}>
          <Button variant="outline">
            <ArrowRightCircle className="w-4 h-4 mr-2" /> View Job
          </Button>
        </Link>
      )}
    </div>
  );
}
