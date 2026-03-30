"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function PortalLoginPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const router = useRouter();

  const requestOtp = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-otp", phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setCustomerId(data.customerId);
        setStep("otp");
        if (data.devOtp) {
          setDevOtp(data.devOtp);
          setOtp(data.devOtp);
        }
        toast.success("Verification code sent!");
      } else {
        toast.error(data.error || "Failed to send code");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || !customerId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-otp", customerId, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Verified! Redirecting...");
        router.push("/portal");
      } else {
        toast.error(data.error || "Invalid code");
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">FP</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Customer Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Fresh Path Mobile Detailing</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {step === "phone" ? (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Sign In</h2>
              <p className="text-sm text-slate-500 mb-4">
                Enter your phone number and we&apos;ll send you a verification code.
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={requestOtp}
                  disabled={!phone || loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Send Code
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Enter Code</h2>
              <p className="text-sm text-slate-500 mb-4">
                We sent a 6-digit code to {phone}
              </p>
              {devOtp && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-700">
                  Dev mode — Code: <strong>{devOtp}</strong>
                </div>
              )}
              <div className="space-y-3">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                />
                <Button
                  className="w-full"
                  onClick={verifyOtp}
                  disabled={otp.length !== 6 || loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Verify
                </Button>
                <button
                  onClick={() => { setStep("phone"); setOtp(""); setDevOtp(""); }}
                  className="text-sm text-slate-500 hover:text-emerald-600 w-full text-center"
                >
                  Use a different number
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
