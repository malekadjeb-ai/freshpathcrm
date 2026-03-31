"use client";

import { formatTime } from "./types";
import type { ServiceOption, BookingForm } from "./types";

interface ConfirmStepProps {
  form: BookingForm;
  vehicleSize: string;
  selectedDate: string;
  selectedTime: string;
  selectedServicesList: ServiceOption[];
  totalPrice: number;
  totalMinutes: number;
  error: string | null;
  getServicePrice: (service: ServiceOption) => number;
}

export function ConfirmStep({
  form,
  vehicleSize,
  selectedDate,
  selectedTime,
  selectedServicesList,
  totalPrice,
  totalMinutes,
  error,
  getServicePrice: _getServicePrice,
}: ConfirmStepProps) {
  const fullAddress = [form.address, form.city, form.state, form.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Review & Confirm</h2>
      <p className="text-sm text-slate-500 mb-5">Make sure everything looks good</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-2.5 border-b border-slate-100">
          <span className="text-slate-500">Services</span>
          <span className="text-slate-900 text-right max-w-[60%]">
            {selectedServicesList.map((s) => s.name).join(", ")}
          </span>
        </div>
        {form.vehicleMake && (
          <div className="flex justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-500">Vehicle</span>
            <span className="text-slate-900">
              {form.vehicleYear} {form.vehicleMake} {form.vehicleModel} ({vehicleSize})
            </span>
          </div>
        )}
        <div className="flex justify-between py-2.5 border-b border-slate-100">
          <span className="text-slate-500">Date</span>
          <span className="text-slate-900">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex justify-between py-2.5 border-b border-slate-100">
          <span className="text-slate-500">Time</span>
          <span className="text-slate-900">{formatTime(selectedTime)}</span>
        </div>
        <div className="flex justify-between py-2.5 border-b border-slate-100">
          <span className="text-slate-500">Duration</span>
          <span className="text-slate-900">~{totalMinutes} min</span>
        </div>
        <div className="flex justify-between py-2.5 border-b border-slate-100">
          <span className="text-slate-500">Name</span>
          <span className="text-slate-900">{form.name}</span>
        </div>
        <div className="flex justify-between py-2.5 border-b border-slate-100">
          <span className="text-slate-500">Phone</span>
          <span className="text-slate-900">{form.phone}</span>
        </div>
        {fullAddress && (
          <div className="flex justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-500">Location</span>
            <span className="text-slate-900 text-right max-w-[60%]">{fullAddress}</span>
          </div>
        )}
        <div className="flex justify-between py-3 font-bold text-xl border-t-2 border-slate-200 mt-2">
          <span>Estimated Total</span>
          <span className="text-emerald-600">${totalPrice.toFixed(2)}</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-4 text-center">
        By confirming, you agree to our cancellation policy. Payment is collected at the time of
        service.
      </p>
    </div>
  );
}
