"use client";

import { User, Phone, Mail, MapPin, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BookingForm } from "./types";

interface ContactStepProps {
  form: BookingForm;
  onFormChange: (patch: Partial<BookingForm>) => void;
}

export function ContactStep({ form, onFormChange }: ContactStepProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Your Information</h2>
      <p className="text-sm text-slate-500 mb-5">How can we reach you?</p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="flex items-center gap-1.5 text-xs text-slate-600">
              <User className="w-3.5 h-3.5" /> Name *
            </Label>
            <Input
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5 text-xs text-slate-600">
              <Phone className="w-3.5 h-3.5" /> Phone *
            </Label>
            <Input
              value={form.phone}
              onChange={(e) => onFormChange({ phone: e.target.value })}
              className="mt-1"
              required
            />
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-1.5 text-xs text-slate-600">
            <Mail className="w-3.5 h-3.5" /> Email
          </Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => onFormChange({ email: e.target.value })}
            className="mt-1"
          />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <Label className="flex items-center gap-1.5 text-xs text-slate-600 mb-3">
            <MapPin className="w-3.5 h-3.5" /> Service Address *
          </Label>
          <div className="space-y-3">
            <Input
              value={form.address}
              onChange={(e) => onFormChange({ address: e.target.value })}
              placeholder="Street address"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={form.city}
                onChange={(e) => onFormChange({ city: e.target.value })}
                placeholder="City"
              />
              <Input
                value={form.state}
                onChange={(e) => onFormChange({ state: e.target.value })}
                placeholder="State"
              />
              <Input
                value={form.zip}
                onChange={(e) => onFormChange({ zip: e.target.value })}
                placeholder="ZIP"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-1.5 text-xs text-slate-600">
            <FileText className="w-3.5 h-3.5" /> Special Instructions
          </Label>
          <Textarea
            value={form.notes}
            onChange={(e) => onFormChange({ notes: e.target.value })}
            className="mt-1"
            rows={2}
            placeholder="Gate code, parking info, anything we should know..."
          />
        </div>
      </div>
    </div>
  );
}
