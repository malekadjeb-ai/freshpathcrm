"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const SignaturePad = dynamic(
  () => import("@/components/signature-pad").then((m) => ({ default: m.SignaturePad })),
  { ssr: false, loading: () => <div className="animate-pulse bg-slate-100 rounded h-32" /> }
);

export function CustomerSignatureCard({
  jobId,
  signature,
  onUpdate,
}: {
  jobId: string;
  signature: string | null;
  onUpdate: () => void;
}) {
  const [showPad, setShowPad] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (dataUrl: string) => {
      const res = await fetch(`/api/jobs/${jobId}/signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: dataUrl }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      onUpdate();
      setShowPad(false);
      toast.success("Signature saved");
    },
    onError: () => toast.error("Failed to save signature"),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/signature`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      onUpdate();
      toast.success("Signature removed");
    },
    onError: () => toast.error("Failed to remove signature"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PenTool className="w-4 h-4 text-emerald-500" />
            Customer Signature
          </CardTitle>
          {signature && !showPad && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowPad(true)}
                className="text-xs text-slate-400 hover:text-emerald-600 transition-colors"
              >
                Re-sign
              </button>
              <button
                onClick={() => clearMutation.mutate()}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showPad ? (
          <SignaturePad
            onSave={(dataUrl) => saveMutation.mutate(dataUrl)}
            onCancel={() => setShowPad(false)}
            saving={saveMutation.isPending}
          />
        ) : signature ? (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signature}
              alt="Customer signature"
              className="max-w-full h-auto max-h-32 mx-auto"
            />
            <p className="text-xs text-slate-400 text-center mt-2">Signed by customer</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400 mb-3">No signature captured</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPad(true)}
            >
              <PenTool className="w-3.5 h-3.5 mr-1.5" />
              Capture Signature
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
