"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Send,
  CheckCircle,
  XCircle,
  ArrowRightCircle,
  Trash2,
  Download,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

const ESTIMATE_STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-800",
  Sent: "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Declined: "bg-red-100 text-red-800",
  Expired: "bg-amber-100 text-amber-800",
  Converted: "bg-purple-100 text-purple-800",
};

interface EstimateDetail {
  id: string;
  estimateNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  total: number;
  notes: string | null;
  validUntil: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    zip: string | null;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string | null;
  } | null;
  lineItems: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    quantity: number;
    service: { name: string; category: string } | null;
  }[];
  convertedJob: { id: string; status: string } | null;
}

export default function EstimateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState("");

  const {
    data: estimate,
    isLoading,
    isError,
    refetch,
  } = useQuery<EstimateDetail>({
    queryKey: ["estimate", params.id],
    queryFn: () => fetchJson(`/api/estimates/${params.id}`),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/estimates/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", params.id] });
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/estimates/${params.id}/convert`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["estimate", params.id] });
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Estimate converted to job!");
      router.push(`/jobs/${job.id}`);
    },
    onError: () => toast.error("Failed to convert estimate"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/estimates/${params.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast.success("Estimate deleted");
      router.push("/estimates");
    },
    onError: () => toast.error("Failed to delete estimate"),
  });

  const sendMutation = useMutation({
    mutationFn: async (method: string) => {
      const res = await fetch(`/api/estimates/${params.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: (_, method) => {
      queryClient.invalidateQueries({ queryKey: ["estimate", params.id] });
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast.success(`Estimate sent via ${method}`);
      setSendDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const followUpMutation = useMutation({
    mutationFn: async ({ method, message }: { method: string; message: string }) => {
      const res = await fetch(`/api/estimates/${params.id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, message: message || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.action === "task_created") {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        toast.success("Follow-up task created");
      } else {
        toast.success(`Follow-up sent via ${data.method}`);
      }
      setFollowUpDialogOpen(false);
      setFollowUpMessage("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError || !estimate || "error" in (estimate as object)) {
    return <ErrorState message="Failed to load estimate." onRetry={refetch} />;
  }

  const taxAmount = estimate.subtotal * (estimate.taxRate / 100);
  const daysSinceSent = estimate.sentAt
    ? Math.floor((Date.now() - new Date(estimate.sentAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link
          href="/estimates"
          className="hover:text-slate-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Estimates
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{estimate.estimateNumber}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span
            className={`text-sm px-3 py-1 rounded-full font-medium ${
              ESTIMATE_STATUS_COLORS[estimate.status] ??
              "bg-slate-100 text-slate-600"
            }`}
          >
            {estimate.status}
          </span>
          <span className="font-mono font-bold text-slate-900">
            {estimate.estimateNumber}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* PDF Download */}
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
              <Button
                variant="outline"
                onClick={() => setSendDialogOpen(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Customer
              </Button>
              <AlertDialog>
                <AlertDialogTrigger render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                } />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete estimate?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this estimate.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-500 hover:bg-red-600"
                      onClick={() => deleteMutation.mutate()}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {estimate.status === "Sent" && (
            <>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => statusMutation.mutate("Approved")}
                disabled={statusMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Approved
              </Button>
              <Button
                variant="outline"
                onClick={() => statusMutation.mutate("Declined")}
                disabled={statusMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Mark Declined
              </Button>
              <Button
                variant="outline"
                onClick={() => setFollowUpDialogOpen(true)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Follow Up
              </Button>
            </>
          )}

          {estimate.status === "Approved" && (
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
            >
              <ArrowRightCircle className="w-4 h-4 mr-2" />
              {convertMutation.isPending
                ? "Converting..."
                : "Convert to Job"}
            </Button>
          )}

          {estimate.status === "Converted" && estimate.convertedJob && (
            <Link href={`/jobs/${estimate.convertedJob.id}`}>
              <Button variant="outline">
                <ArrowRightCircle className="w-4 h-4 mr-2" />
                View Job
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Follow-up alert for sent estimates */}
      {estimate.status === "Sent" && daysSinceSent !== null && daysSinceSent >= 2 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-800">
              Awaiting response — sent {daysSinceSent} day{daysSinceSent !== 1 ? "s" : ""} ago
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Consider following up with the customer.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => setFollowUpDialogOpen(true)}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Follow Up
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-2 font-medium text-slate-500">
                      Item
                    </th>
                    <th className="text-center pb-2 font-medium text-slate-500">
                      Qty
                    </th>
                    <th className="text-right pb-2 font-medium text-slate-500">
                      Price
                    </th>
                    <th className="text-right pb-2 font-medium text-slate-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="py-3">
                        <span className="font-medium text-slate-900">
                          {item.name}
                        </span>
                        {item.description && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-center">{item.quantity}</td>
                      <td className="py-3 text-right">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mt-4">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(estimate.subtotal)}</span>
                  </div>
                  {estimate.taxRate > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Tax ({estimate.taxRate}%)</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  {estimate.discount > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Discount</span>
                      <span>- {formatCurrency(estimate.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xl border-t border-slate-200 pt-2">
                    <span>Total</span>
                    <span className="text-emerald-600">
                      {formatCurrency(estimate.total)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {estimate.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {estimate.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/customers/${estimate.customer.id}`}
                className="font-semibold text-slate-900 hover:text-emerald-600 transition-colors"
              >
                {estimate.customer.name}
              </Link>
              {estimate.customer.phone && (
                <p className="text-sm text-slate-500 mt-1">
                  {estimate.customer.phone}
                </p>
              )}
              {estimate.customer.email && (
                <p className="text-sm text-slate-500">
                  {estimate.customer.email}
                </p>
              )}
            </CardContent>
          </Card>

          {estimate.vehicle && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Vehicle</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700">
                  {estimate.vehicle.year} {estimate.vehicle.make}{" "}
                  {estimate.vehicle.model}
                  {estimate.vehicle.color
                    ? ` — ${estimate.vehicle.color}`
                    : ""}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-700">
                  {formatDate(estimate.createdAt)}
                </span>
              </div>
              {estimate.validUntil && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Valid Until</span>
                  <span className="text-slate-700">
                    {formatDate(estimate.validUntil)}
                  </span>
                </div>
              )}
              {estimate.sentAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Sent</span>
                  <span className="text-slate-700">
                    {formatDate(estimate.sentAt)}
                  </span>
                </div>
              )}
              {estimate.respondedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Responded</span>
                  <span className="text-slate-700">
                    {formatDate(estimate.respondedAt)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Estimate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mb-4">
            Send {estimate.estimateNumber} ({formatCurrency(estimate.total)}) to{" "}
            {estimate.customer.name}
          </p>
          <div className="space-y-2">
            <Button
              className="w-full justify-start"
              variant="outline"
              disabled={!estimate.customer.email || sendMutation.isPending}
              onClick={() => sendMutation.mutate("email")}
            >
              <Mail className="w-4 h-4 mr-3" />
              <div className="text-left">
                <div className="text-sm font-medium">Send via Email</div>
                <div className="text-xs text-slate-400">
                  {estimate.customer.email || "No email on file"}
                </div>
              </div>
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              disabled={!estimate.customer.phone || sendMutation.isPending}
              onClick={() => sendMutation.mutate("sms")}
            >
              <MessageSquare className="w-4 h-4 mr-3" />
              <div className="text-left">
                <div className="text-sm font-medium">Send via SMS</div>
                <div className="text-xs text-slate-400">
                  {estimate.customer.phone || "No phone on file"}
                </div>
              </div>
            </Button>
          </div>
          {sendMutation.isPending && (
            <p className="text-xs text-slate-400 text-center mt-2">Sending...</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Follow Up Dialog */}
      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Follow Up on Estimate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mb-2">
            {estimate.estimateNumber} &middot; {estimate.customer.name}
            {daysSinceSent !== null && ` &middot; Sent ${daysSinceSent} days ago`}
          </p>
          <div className="space-y-3">
            <div>
              <Label>Custom message (optional)</Label>
              <Textarea
                value={followUpMessage}
                onChange={(e) => setFollowUpMessage(e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="Leave blank to use default follow-up message..."
              />
            </div>
            <div className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                disabled={!estimate.customer.email || followUpMutation.isPending}
                onClick={() => followUpMutation.mutate({ method: "email", message: followUpMessage })}
              >
                <Mail className="w-4 h-4 mr-3" />
                Follow up via Email
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                disabled={!estimate.customer.phone || followUpMutation.isPending}
                onClick={() => followUpMutation.mutate({ method: "sms", message: followUpMessage })}
              >
                <MessageSquare className="w-4 h-4 mr-3" />
                Follow up via SMS
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                disabled={followUpMutation.isPending}
                onClick={() => followUpMutation.mutate({ method: "call", message: followUpMessage })}
              >
                <Phone className="w-4 h-4 mr-3" />
                Create call-back task
              </Button>
            </div>
          </div>
          {followUpMutation.isPending && (
            <p className="text-xs text-slate-400 text-center mt-2">Processing...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
