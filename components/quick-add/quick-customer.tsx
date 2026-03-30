"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Users, ChevronDown, ChevronUp, Car, AlertTriangle, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface QuickCustomerProps {
  onClose: () => void;
  onCreated?: (customer: { id: string; name: string }) => void;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function parseContactString(input: string): { name?: string; phone?: string; email?: string; address?: string } {
  const phone = input.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0];
  const email = input.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
  let remaining = input.replace(phone || "", "").replace(email || "", "");
  const address = remaining.match(/\d+\s+[\w\s]+(?:St|Ave|Blvd|Dr|Rd|Ln|Ct|Way|Pkwy|Cir)/i)?.[0];
  remaining = remaining.replace(address || "", "").replace(/[,;|]/g, "").trim();
  const name = remaining || undefined;
  return {
    name,
    phone: phone ? formatPhone(phone) : undefined,
    email: email || undefined,
    address: address?.trim(),
  };
}

export function QuickCustomer({ onClose, onCreated }: QuickCustomerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Richmond");
  const [pasteInput, setPasteInput] = useState("");

  // Expandable sections
  const [showVehicle, setShowVehicle] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Vehicle fields
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleType, setVehicleType] = useState("Sedan");

  // More details
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [gateCode, setGateCode] = useState("");

  // Duplicate detection
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);

  // Auto-focus name field
  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 100);
  }, []);

  // Duplicate check on phone change
  useEffect(() => {
    if (phone.replace(/\D/g, "").length < 7) {
      setDuplicate(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const digits = phone.replace(/\D/g, "");
        const res = await fetch(`/api/customers/search?q=${digits}`);
        if (res.ok) {
          const results = await res.json();
          if (results.length > 0) {
            setDuplicate({ id: results[0].id, name: results[0].name });
          } else {
            setDuplicate(null);
          }
        }
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [phone]);

  // Smart paste handler
  const handlePaste = useCallback((value: string) => {
    setPasteInput(value);
    if (value.length < 5) return;
    const parsed = parseContactString(value);
    if (parsed.name && !name) setName(parsed.name);
    if (parsed.phone && !phone) setPhone(parsed.phone);
    if (parsed.email && !email) setEmail(parsed.email);
    if (parsed.address && !address) setAddress(parsed.address);
    if (parsed.email || parsed.address) setShowMore(true);
  }, [name, phone, email, address]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        name,
        phone: phone || undefined,
        city: city || undefined,
        email: email || undefined,
        address: address || undefined,
        source: source || undefined,
        gateCode: gateCode || undefined,
        specialInstructions: notes || undefined,
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return res.json();
    },
    onSuccess: async (customer) => {
      // Create vehicle if fields were filled
      if (vehicleMake && vehicleModel && vehicleYear) {
        try {
          await fetch(`/api/customers/${customer.id}/vehicles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              make: vehicleMake,
              model: vehicleModel,
              year: parseInt(vehicleYear),
              vehicleType,
            }),
          });
        } catch { /* vehicle creation is best-effort */ }
      }

      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] });

      onCreated?.(customer);
      onClose();

      toast.success(`${customer.name} added`, {
        action: {
          label: "View Profile",
          onClick: () => router.push(`/customers/${customer.id}`),
        },
      });
    },
    onError: () => toast.error("Failed to create customer"),
  });

  const canSubmit = name.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-slate-200">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <Users className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Quick Add Customer</h2>
          <p className="text-xs text-slate-500">3 fields, 10 seconds</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Core fields */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="qc-name" className="text-sm font-medium">Name *</Label>
            <Input
              ref={nameRef}
              id="qc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="mt-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("qc-phone")?.focus();
                }
              }}
            />
          </div>
          <div>
            <Label htmlFor="qc-phone" className="text-sm font-medium">Phone</Label>
            <Input
              id="qc-phone"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(832) 555-1234"
              className="mt-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  createMutation.mutate();
                }
              }}
            />
            {duplicate && (
              <div className="flex items-center gap-2 mt-1.5 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>This phone matches <strong>{duplicate.name}</strong>.</span>
                <button
                  onClick={() => { onClose(); router.push(`/customers/${duplicate.id}`); }}
                  className="text-amber-700 underline font-medium ml-1"
                >
                  View
                </button>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="qc-city" className="text-sm font-medium">City</Label>
            <Select value={city} onValueChange={(v) => v && setCity(v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Richmond">Richmond</SelectItem>
                <SelectItem value="Katy">Katy</SelectItem>
                <SelectItem value="Sugar Land">Sugar Land</SelectItem>
                <SelectItem value="Houston">Houston</SelectItem>
                <SelectItem value="Rosenberg">Rosenberg</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expandable: Vehicle */}
        <button
          onClick={() => setShowVehicle(!showVehicle)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors w-full"
        >
          <Car className="w-4 h-4" />
          <span>Add Vehicle</span>
          {showVehicle ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>
        {showVehicle && (
          <div className="grid grid-cols-3 gap-2 pl-6">
            <Input
              value={vehicleYear}
              onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Year"
            />
            <Input
              value={vehicleMake}
              onChange={(e) => setVehicleMake(e.target.value)}
              placeholder="Make"
            />
            <Input
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="Model"
            />
            <Select value={vehicleType} onValueChange={(v) => v && setVehicleType(v)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Vehicle type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sedan">Sedan</SelectItem>
                <SelectItem value="SUV">SUV</SelectItem>
                <SelectItem value="Truck">Truck</SelectItem>
                <SelectItem value="Van">Van</SelectItem>
                <SelectItem value="Luxury">Luxury</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Expandable: More Details */}
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors w-full"
        >
          <ChevronDown className="w-4 h-4" />
          <span>More Details</span>
          {showMore ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>
        {showMore && (
          <div className="space-y-3 pl-6">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" />
            <Input value={gateCode} onChange={(e) => setGateCode(e.target.value)} placeholder="Gate code" />
            <Select value={source} onValueChange={(v) => v && setSource(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Google">Google</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Yelp">Yelp</SelectItem>
                <SelectItem value="Nextdoor">Nextdoor</SelectItem>
                <SelectItem value="Walk-in">Walk-in</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes / special instructions"
              rows={2}
            />
          </div>
        )}

        {/* Smart paste */}
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <ClipboardPaste className="w-3 h-3" />
            <span>Or paste a contact</span>
          </div>
          <Input
            value={pasteInput}
            onChange={(e) => handlePaste(e.target.value)}
            placeholder='e.g. "John Smith 832-555-1234 john@email.com"'
            className="text-xs"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!canSubmit || createMutation.isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-medium"
        >
          {createMutation.isPending ? "Saving..." : "Save Customer"}
        </Button>
      </div>
    </div>
  );
}
