"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentInfo {
  invoiceNumber: string;
  total: number;
  remaining: number;
  status: string;
  customerName: string;
  services: string;
  businessName: string;
}

export default function PaymentPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status");
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pay/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInfo(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load payment information");
        setLoading(false);
      });
  }, [params.id]);

  async function handlePay() {
    setPaying(true);
    try {
      const res = await fetch(`/api/pay/${params.id}/checkout`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to create checkout session");
        setPaying(false);
      }
    } catch {
      setError("Something went wrong");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (urlStatus === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-slate-500">
            Thank you for your payment. You will receive a confirmation shortly.
          </p>
        </div>
      </div>
    );
  }

  if (urlStatus === "cancelled") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-slate-500 mb-4">
            Your payment was not processed. You can try again anytime.
          </p>
          <Button
            onClick={handlePay}
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={paying}
          >
            {paying ? "Processing..." : "Try Again"}
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Error</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  if (info.status === "Paid" || info.remaining <= 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Already Paid
          </h1>
          <p className="text-slate-500">
            This invoice has already been paid. Thank you!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">FP</span>
          </div>
          <div>
            <div className="font-bold text-slate-900">{info.businessName}</div>
            <div className="text-xs text-slate-400">Online Payment</div>
          </div>
        </div>

        {/* Invoice details */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Invoice</span>
            <span className="font-mono font-medium text-slate-900">
              {info.invoiceNumber}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Customer</span>
            <span className="text-slate-900">{info.customerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Services</span>
            <span className="text-slate-900 text-right max-w-48 truncate">
              {info.services}
            </span>
          </div>
          <div className="border-t border-slate-200 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="font-medium text-slate-700">Amount Due</span>
              <span className="text-2xl font-bold text-emerald-600">
                ${info.remaining.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Pay button */}
        <Button
          onClick={handlePay}
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
          disabled={paying}
        >
          {paying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Pay ${info.remaining.toFixed(2)}
            </>
          )}
        </Button>

        <p className="text-xs text-slate-400 text-center mt-4">
          Secure payment processed by Stripe
        </p>
      </div>
    </div>
  );
}
