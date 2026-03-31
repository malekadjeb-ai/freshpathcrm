"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomerDetailData } from "./customer-types";

interface EditCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  customer: CustomerDetailData;
  onSave: (data: Record<string, unknown>) => void;
  isPending: boolean;
}

export function EditCustomerDialog({ open, onClose, customer, onSave, isPending }: EditCustomerDialogProps) {
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone || "",
    phoneCarrier: customer.phoneCarrier || "",
    email: customer.email || "",
    address: customer.address || "",
    city: customer.city || "",
    zip: customer.zip || "",
    neighborhood: customer.neighborhood || "",
    source: customer.source || "",
    sourceDetail: customer.sourceDetail || "",
    preferredContact: customer.preferredContact || "text",
    birthday: customer.birthday ? customer.birthday.slice(0, 10) : "",
    gateCode: customer.gateCode || "",
    specialInstructions: customer.specialInstructions || "",
    isCommercial: customer.isCommercial || false,
    companyName: customer.companyName || "",
    taxId: customer.taxId || "",
    billingEmail: customer.billingEmail || "",
    billingContact: customer.billingContact || "",
    paymentTerms: customer.paymentTerms || "",
    fleetSize: customer.fleetSize?.toString() || "",
    fleetDiscount: customer.fleetDiscount?.toString() || "",
    contractNotes: customer.contractNotes || "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Carrier</Label>
              <Select value={form.phoneCarrier || ""} onValueChange={(v) => handleChange("phoneCarrier", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="att">AT&T</SelectItem>
                  <SelectItem value="verizon">Verizon</SelectItem>
                  <SelectItem value="tmobile">T-Mobile</SelectItem>
                  <SelectItem value="sprint">Sprint</SelectItem>
                  <SelectItem value="boost">Boost</SelectItem>
                  <SelectItem value="cricket">Cricket</SelectItem>
                  <SelectItem value="metropcs">MetroPCS</SelectItem>
                  <SelectItem value="uscellular">US Cellular</SelectItem>
                  <SelectItem value="virgin">Virgin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>ZIP</Label>
              <Input value={form.zip} onChange={(e) => handleChange("zip", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Neighborhood</Label>
              <Input value={form.neighborhood} onChange={(e) => handleChange("neighborhood", e.target.value)} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Additional Info</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Preferred Contact</Label>
                  <Select value={form.preferredContact} onValueChange={(v) => handleChange("preferredContact", v ?? "text")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text/SMS</SelectItem>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Birthday</Label>
                  <Input type="date" value={form.birthday} onChange={(e) => handleChange("birthday", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => handleChange("source", v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="How they found you" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="nextdoor">Nextdoor</SelectItem>
                      <SelectItem value="yelp">Yelp</SelectItem>
                      <SelectItem value="flyer">Flyer</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="repeat">Repeat Customer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Source Detail</Label>
                  <Input
                    value={form.sourceDetail}
                    onChange={(e) => handleChange("sourceDetail", e.target.value)}
                    placeholder="e.g. who referred them"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Gate Code</Label>
                <Input value={form.gateCode} onChange={(e) => handleChange("gateCode", e.target.value)} placeholder="Community gate code" />
              </div>
              <div className="space-y-1.5">
                <Label>Special Instructions</Label>
                <Textarea
                  rows={2}
                  value={form.specialInstructions}
                  onChange={(e) => handleChange("specialInstructions", e.target.value)}
                  placeholder="Parking, access, pet warnings, etc."
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="isCommercial"
                checked={form.isCommercial}
                onChange={(e) => setForm((prev) => ({ ...prev, isCommercial: e.target.checked }))}
                className="rounded border-slate-300"
              />
              <Label htmlFor="isCommercial" className="text-xs font-medium text-slate-400 uppercase tracking-wide cursor-pointer">
                Fleet / Commercial Account
              </Label>
            </div>
            {form.isCommercial && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Company Name</Label>
                    <Input value={form.companyName} onChange={(e) => handleChange("companyName", e.target.value)} placeholder="ABC Corp" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tax ID / EIN</Label>
                    <Input value={form.taxId} onChange={(e) => handleChange("taxId", e.target.value)} placeholder="XX-XXXXXXX" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Billing Contact</Label>
                    <Input value={form.billingContact} onChange={(e) => handleChange("billingContact", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Billing Email</Label>
                    <Input type="email" value={form.billingEmail} onChange={(e) => handleChange("billingEmail", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Payment Terms</Label>
                    <Select value={form.paymentTerms || "due_on_receipt"} onValueChange={(v) => handleChange("paymentTerms", String(v ?? ""))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                        <SelectItem value="net_15">Net 15</SelectItem>
                        <SelectItem value="net_30">Net 30</SelectItem>
                        <SelectItem value="net_60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fleet Size</Label>
                    <Input type="number" min="0" value={form.fleetSize} onChange={(e) => handleChange("fleetSize", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fleet Discount %</Label>
                    <Input type="number" min="0" max="100" step="0.5" value={form.fleetDiscount} onChange={(e) => handleChange("fleetDiscount", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Contract Notes</Label>
                  <Textarea
                    rows={2}
                    value={form.contractNotes}
                    onChange={(e) => handleChange("contractNotes", e.target.value)}
                    placeholder="Contract terms, special agreements..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({
              name: form.name,
              phone: form.phone || null,
              email: form.email || null,
              address: form.address || null,
              city: form.city || null,
              zip: form.zip || null,
              neighborhood: form.neighborhood || null,
              source: form.source || null,
              sourceDetail: form.sourceDetail || null,
              preferredContact: form.preferredContact || "text",
              birthday: form.birthday || null,
              gateCode: form.gateCode || null,
              specialInstructions: form.specialInstructions || null,
              isCommercial: form.isCommercial,
              companyName: form.companyName || null,
              taxId: form.taxId || null,
              billingEmail: form.billingEmail || null,
              billingContact: form.billingContact || null,
              paymentTerms: form.paymentTerms || null,
              fleetSize: form.fleetSize ? parseInt(form.fleetSize) : null,
              fleetDiscount: form.fleetDiscount ? parseFloat(form.fleetDiscount) : null,
              contractNotes: form.contractNotes || null,
            })}
            disabled={!form.name.trim() || isPending}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
