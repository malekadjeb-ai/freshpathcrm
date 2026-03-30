"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Sparkles,
  CalendarDays,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface VehicleModifier {
  vehicleType: string;
  priceAdjustment: number;
}

interface ServiceOption {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  category: string;
  estimatedMinutes: number | null;
  modifiers: VehicleModifier[];
}

interface BookingConfig {
  businessName: string;
  phone: string;
  pageTitle: string;
  pageDescription: string | null;
  workingDays: number[];
}

const STEPS = ["Services", "Vehicle", "Date & Time", "Your Info", "Confirm"];

const VEHICLE_SIZES = [
  { value: "Sedan", label: "Sedan", icon: "🚗" },
  { value: "Coupe", label: "Coupe", icon: "🏎️" },
  { value: "SUV", label: "SUV", icon: "🚙" },
  { value: "Truck", label: "Truck", icon: "🛻" },
  { value: "Van", label: "Van", icon: "🚐" },
  { value: "Luxury", label: "Luxury", icon: "✨" },
];

const VEHICLE_MAKES = [
  "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler",
  "Dodge", "Ford", "Genesis", "GMC", "Honda", "Hyundai", "Infiniti",
  "Jaguar", "Jeep", "Kia", "Land Rover", "Lexus", "Lincoln", "Mazda",
  "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Porsche", "Ram",
  "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo", "Other",
];

const YEARS = Array.from({ length: 28 }, (_, i) => 2027 - i);

export default function BookingPage() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  // Selections
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [vehicleSize, setVehicleSize] = useState("Sedan");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotMessage, setSlotMessage] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Customer info
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleColor: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/booking/config").then((r) => r.json()),
      fetch("/api/booking/services").then((r) => r.json()),
    ])
      .then(([cfg, svcs]) => {
        if (cfg.error) {
          setError(cfg.error);
        } else {
          setConfig(cfg);
          setServices(svcs);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load booking page");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    setSlotMessage("");
    fetch(`/api/booking/availability?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.closed) {
          setSlotMessage("We're closed on this day");
          setAvailableSlots([]);
        } else if (data.full) {
          setSlotMessage("Fully booked on this day");
          setAvailableSlots([]);
        } else {
          setAvailableSlots(data.slots || []);
          if ((data.slots || []).length === 0) {
            setSlotMessage("No slots available");
          }
        }
        setSlotsLoading(false);
      })
      .catch(() => {
        setSlotsLoading(false);
        setSlotMessage("Failed to load availability");
      });
  }, [selectedDate]);

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, ServiceOption[]> = {};
    for (const s of services) {
      const cat = s.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    }
    return grouped;
  }, [services]);

  // Calculate price with vehicle size modifier
  function getServicePrice(service: ServiceOption): number {
    const modifier = service.modifiers.find((m) => m.vehicleType === vehicleSize);
    return service.basePrice + (modifier?.priceAdjustment || 0);
  }

  const selectedServicesList = services.filter((s) =>
    selectedServices.includes(s.id)
  );
  const totalPrice = selectedServicesList.reduce(
    (sum, s) => sum + getServicePrice(s),
    0
  );
  const totalMinutes = selectedServicesList.reduce(
    (sum, s) => sum + (s.estimatedMinutes || 60),
    0
  );

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/booking/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          date: selectedDate,
          time: selectedTime,
          serviceIds: selectedServices,
          vehicleMake: form.vehicleMake || undefined,
          vehicleModel: form.vehicleModel || undefined,
          vehicleYear: form.vehicleYear ? parseInt(form.vehicleYear) : undefined,
          vehicleColor: form.vehicleColor || undefined,
          vehicleType: vehicleSize,
          address: [form.address, form.city, form.state, form.zip]
            .filter(Boolean)
            .join(", ") || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setConfirmMessage(data.message);
      } else {
        setError(data.error || "Failed to submit booking");
      }
    } catch {
      setError("Something went wrong");
    }
    setSubmitting(false);
  }

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function canProceed() {
    switch (step) {
      case 0: return selectedServices.length > 0;
      case 1: return true; // vehicle info is optional but step is for size selection
      case 2: return selectedDate && selectedTime;
      case 3: return form.name && form.phone;
      case 4: return true;
      default: return false;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold">FP</span>
          </div>
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-7 h-7 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Booking Unavailable
          </h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-slate-500 mb-6">{confirmMessage}</p>
          <div className="bg-slate-50 rounded-xl p-5 text-sm text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-medium text-slate-900">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time</span>
              <span className="font-medium text-slate-900">{formatTime(selectedTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Services</span>
              <span className="font-medium text-slate-900 text-right max-w-[200px]">
                {selectedServicesList.map((s) => s.name).join(", ")}
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
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5" />
            We&apos;ll send you a reminder before your appointment
          </div>
          {config?.phone && (
            <p className="text-xs text-slate-400 mt-3">
              Questions? Call us at <a href={`tel:${config.phone}`} className="text-emerald-600 underline">{config.phone}</a>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-bold text-sm">FP</span>
            </div>
            <div>
              <div className="font-bold text-white">{config?.businessName}</div>
              <div className="text-emerald-400 text-xs font-medium">Online Booking</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-white">{config?.pageTitle}</h1>
        {config?.pageDescription && (
          <p className="text-slate-400 text-sm mt-1">{config.pageDescription}</p>
        )}
      </div>

      {/* Steps indicator */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                  i < step
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : i === step
                    ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500"
                    : "bg-slate-800 text-slate-600"
                )}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={cn(
                "text-[11px] font-medium hidden sm:block truncate",
                i === step ? "text-emerald-400" : i < step ? "text-slate-500" : "text-slate-600"
              )}>
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "h-px flex-1 mx-1",
                  i < step ? "bg-emerald-500/50" : "bg-slate-800"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-2xl mx-auto px-4 pb-32">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-6">
          {/* Step 0: Services */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Select Services
              </h2>
              <p className="text-sm text-slate-500 mb-5">Choose the services you&apos;d like for your vehicle</p>

              {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryServices.map((service) => {
                      const price = getServicePrice(service);
                      const isSelected = selectedServices.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          onClick={() => toggleService(service.id)}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border-2 transition-all",
                            isSelected
                              ? "border-emerald-500 bg-emerald-50 shadow-sm"
                              : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="font-semibold text-slate-900">{service.name}</div>
                                {isSelected && (
                                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                )}
                              </div>
                              {service.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                  {service.description}
                                </p>
                              )}
                              {service.estimatedMinutes && (
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  ~{service.estimatedMinutes} min
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-4 shrink-0">
                              <span className={cn(
                                "text-lg font-bold",
                                isSelected ? "text-emerald-600" : "text-slate-900"
                              )}>
                                ${price.toFixed(0)}
                              </span>
                              {price !== service.basePrice && (
                                <div className="text-[10px] text-slate-400 line-through">
                                  ${service.basePrice.toFixed(0)}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Vehicle Info */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Vehicle Information
              </h2>
              <p className="text-sm text-slate-500 mb-5">Select your vehicle size to get accurate pricing</p>

              {/* Size Class */}
              <div className="mb-6">
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">Vehicle Size</Label>
                <div className="grid grid-cols-3 gap-2">
                  {VEHICLE_SIZES.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setVehicleSize(size.value)}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all text-center",
                        vehicleSize === size.value
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="text-2xl mb-1">{size.icon}</div>
                      <div className={cn(
                        "text-sm font-medium",
                        vehicleSize === size.value ? "text-emerald-700" : "text-slate-700"
                      )}>
                        {size.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Year</Label>
                    <select
                      value={form.vehicleYear}
                      onChange={(e) => setForm({ ...form, vehicleYear: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select year</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Make</Label>
                    <select
                      value={form.vehicleMake}
                      onChange={(e) => setForm({ ...form, vehicleMake: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select make</option>
                      {VEHICLE_MAKES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Model</Label>
                    <Input
                      value={form.vehicleModel}
                      onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
                      className="mt-1"
                      placeholder="e.g. Camry"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Color</Label>
                    <Input
                      value={form.vehicleColor}
                      onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })}
                      className="mt-1"
                      placeholder="e.g. White"
                    />
                  </div>
                </div>
              </div>

              {/* Price adjustment notice */}
              {selectedServices.length > 0 && (
                <div className="mt-5 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm">
                  <div className="flex items-center gap-2 text-emerald-700 font-medium">
                    <Sparkles className="w-4 h-4" />
                    Updated pricing for {vehicleSize}
                  </div>
                  <div className="text-emerald-600 text-xs mt-1">
                    {selectedServicesList.map((s) => (
                      <span key={s.id} className="mr-3">
                        {s.name}: ${getServicePrice(s).toFixed(0)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Pick a Date & Time
              </h2>
              <p className="text-sm text-slate-500 mb-5">Choose when you&apos;d like your service</p>
              <MiniCalendar
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selectedDate={selectedDate}
                onSelectDate={(d) => { setSelectedDate(d); setSelectedTime(""); }}
                workingDays={config?.workingDays || [1, 2, 3, 4, 5, 6]}
              />

              {selectedDate && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    Available Times for {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </h3>
                  {slotsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                  ) : slotMessage ? (
                    <p className="text-sm text-slate-500 text-center py-4">{slotMessage}</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all",
                            selectedTime === slot
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                              : "border-slate-100 text-slate-700 hover:border-slate-200"
                          )}
                        >
                          {formatTime(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Your Info */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Your Information
              </h2>
              <p className="text-sm text-slate-500 mb-5">How can we reach you?</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="flex items-center gap-1.5 text-xs text-slate-600"><User className="w-3.5 h-3.5" /> Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" required />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 text-xs text-slate-600"><Phone className="w-3.5 h-3.5" /> Phone *</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" required />
                  </div>
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 text-xs text-slate-600"><Mail className="w-3.5 h-3.5" /> Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <Label className="flex items-center gap-1.5 text-xs text-slate-600 mb-3"><MapPin className="w-3.5 h-3.5" /> Service Address *</Label>
                  <div className="space-y-3">
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Street address"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        placeholder="City"
                      />
                      <Input
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        placeholder="State"
                      />
                      <Input
                        value={form.zip}
                        onChange={(e) => setForm({ ...form, zip: e.target.value })}
                        placeholder="ZIP"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-1.5 text-xs text-slate-600"><FileText className="w-3.5 h-3.5" /> Special Instructions</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} placeholder="Gate code, parking info, anything we should know..." />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Review & Confirm
              </h2>
              <p className="text-sm text-slate-500 mb-5">Make sure everything looks good</p>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2.5 border-b border-slate-100">
                  <span className="text-slate-500">Services</span>
                  <span className="text-slate-900 text-right max-w-[60%]">{selectedServicesList.map((s) => s.name).join(", ")}</span>
                </div>
                {form.vehicleMake && (
                  <div className="flex justify-between py-2.5 border-b border-slate-100">
                    <span className="text-slate-500">Vehicle</span>
                    <span className="text-slate-900">{form.vehicleYear} {form.vehicleMake} {form.vehicleModel} ({vehicleSize})</span>
                  </div>
                )}
                <div className="flex justify-between py-2.5 border-b border-slate-100">
                  <span className="text-slate-500">Date</span>
                  <span className="text-slate-900">{new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
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
                {form.address && (
                  <div className="flex justify-between py-2.5 border-b border-slate-100">
                    <span className="text-slate-500">Location</span>
                    <span className="text-slate-900 text-right max-w-[60%]">
                      {[form.address, form.city, form.state, form.zip].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-3 font-bold text-xl border-t-2 border-slate-200 mt-2">
                  <span>Estimated Total</span>
                  <span className="text-emerald-600">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">
                By confirming, you agree to our cancellation policy. Payment is collected at the time of service.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
            {step > 0 ? (
              <Button variant="outline" onClick={() => { setStep(step - 1); setError(null); }}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : (
              <div />
            )}
            {step < 4 ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                disabled={!canProceed()}
                onClick={() => setStep(step + 1)}
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Booking
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      {selectedServices.length > 0 && step < 4 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 z-30">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-xs">
                {selectedServices.length} service{selectedServices.length > 1 ? "s" : ""} &middot; ~{totalMinutes} min
              </div>
              <div className="text-white font-bold text-lg">
                ${totalPrice.toFixed(2)}
              </div>
            </div>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
              disabled={!canProceed()}
              onClick={() => step < 4 ? setStep(step + 1) : handleSubmit()}
            >
              {step < 3 ? "Continue" : step === 3 ? "Review" : "Confirm"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function MiniCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  workingDays,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  workingDays: number[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prevMonth = () => onMonthChange(new Date(year, mo - 1, 1));
  const nextMonth = () => onMonthChange(new Date(year, mo + 1, 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" onClick={prevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold text-slate-900">
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-xs font-semibold text-slate-400 py-1">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={i} />;
          const date = new Date(year, mo, day);
          const dateStr = `${year}-${(mo + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
          const isPast = date < today;
          const isWorkingDay = workingDays.includes(date.getDay());
          const isSelected = dateStr === selectedDate;
          const isToday = date.getTime() === today.getTime();
          const isDisabled = isPast || !isWorkingDay;

          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                "py-2 rounded-xl text-sm font-medium transition-all relative",
                isSelected
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : isDisabled
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700",
                isToday && !isSelected && "ring-1 ring-emerald-500"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
