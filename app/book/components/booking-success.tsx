"use client";

import { CheckCircle, Shield, Calendar, Home, Share2 } from "lucide-react";
import { formatTime } from "./types";
import type { ServiceOption, BookingConfig } from "./types";

interface BookingSuccessProps {
  confirmMessage: string;
  bookingReference: string;
  selectedDate: string;
  selectedTime: string;
  selectedServicesList: ServiceOption[];
  totalPrice: number;
  form: { vehicleYear: string; vehicleMake: string; vehicleModel: string };
  config: BookingConfig | null;
}

function buildGoogleCalendarUrl(opts: {
  date: string;
  time: string;
  serviceNames: string;
  businessName: string;
  address: string;
}): string {
  const { date, time, serviceNames, businessName, address } = opts;
  const start = `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
  // Assume 2-hour duration by default
  const [h, m] = time.split(":").map(Number);
  const endH = String(h + 2).padStart(2, "0");
  const end = `${date.replace(/-/g, "")}T${endH}${String(m).padStart(2, "0")}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${businessName} — ${serviceNames}`,
    dates: `${start}/${end}`,
    location: address || "Mobile — we come to you",
    details: `Mobile detail appointment with ${businessName}.`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function BookingSuccess({
  confirmMessage,
  bookingReference,
  selectedDate,
  selectedTime,
  selectedServicesList,
  totalPrice,
  form,
  config,
}: BookingSuccessProps) {
  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const serviceNames = selectedServicesList.map((s) => s.name).join(", ");

  const calendarUrl = buildGoogleCalendarUrl({
    date: selectedDate,
    time: selectedTime,
    serviceNames,
    businessName: config?.businessName ?? "Fresh Path Mobile Detailing",
    address: "",
  });

  function handleShare() {
    const text =
      `I just booked a mobile detail with ${config?.businessName ?? "Fresh Path Mobile Detailing"} ` +
      `on ${displayDate} at ${formatTime(selectedTime)}!`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed!</h1>
        <p className="text-slate-500 mb-4">{confirmMessage}</p>

        {bookingReference && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-6 inline-block">
            <p className="text-xs text-slate-400 mb-0.5">Booking Reference</p>
            <p className="font-mono text-base font-bold text-emerald-600 tracking-wider">
              {bookingReference}
            </p>
          </div>
        )}

        <div className="bg-slate-50 rounded-xl p-5 text-sm text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Date</span>
            <span className="font-medium text-slate-900">{displayDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Time</span>
            <span className="font-medium text-slate-900">{formatTime(selectedTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Services</span>
            <span className="font-medium text-slate-900 text-right max-w-[200px]">
              {serviceNames}
            </span>
          </div>
          {form.vehicleMake && (
            <div className="flex justify-between">
              <span className="text-slate-500">Vehicle</span>
              <span className="font-medium text-slate-900">
                {form.vehicleYear} {form.vehicleMake} {form.vehicleModel}
              </span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-emerald-600">${totalPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            Add to Calendar
          </a>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            Share
          </button>
        </div>

        <a
          href="/"
          className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          <Home className="w-4 h-4" />
          Back to Homepage
        </a>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5" />
          We&apos;ll send you a reminder before your appointment
        </div>
        {config?.phone && (
          <p className="text-xs text-slate-400 mt-3">
            Questions? Call us at{" "}
            <a href={`tel:${config.phone}`} className="text-emerald-600 underline">
              {config.phone}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
