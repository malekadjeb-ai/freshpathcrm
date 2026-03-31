"use client";

import { useState, useEffect, useMemo } from "react";
import type { ServiceOption, BookingConfig, BookingForm } from "../components/types";

const INITIAL_FORM: BookingForm = {
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
};

export function useBooking() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [vehicleSize, setVehicleSize] = useState("Sedan");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotMessage, setSlotMessage] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [form, setForm] = useState<BookingForm>(INITIAL_FORM);

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
          if ((data.slots || []).length === 0) setSlotMessage("No slots available");
        }
        setSlotsLoading(false);
      })
      .catch(() => {
        setSlotsLoading(false);
        setSlotMessage("Failed to load availability");
      });
  }, [selectedDate]);

  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, ServiceOption[]> = {};
    for (const s of services) {
      const cat = s.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    }
    return grouped;
  }, [services]);

  function getServicePrice(service: ServiceOption): number {
    const modifier = service.modifiers.find((m) => m.vehicleType === vehicleSize);
    return service.basePrice + (modifier?.priceAdjustment || 0);
  }

  const selectedServicesList = services.filter((s) => selectedServices.includes(s.id));
  const totalPrice = selectedServicesList.reduce((sum, s) => sum + getServicePrice(s), 0);
  const totalMinutes = selectedServicesList.reduce((sum, s) => sum + (s.estimatedMinutes || 60), 0);

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return selectedServices.length > 0;
      case 1: return true;
      case 2: return !!(selectedDate && selectedTime);
      case 3: return !!(form.name && form.phone);
      case 4: return true;
      default: return false;
    }
  }

  function goToStep(n: number) {
    setStep(n);
    setError(null);
  }

  function updateForm(patch: Partial<BookingForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleSelectDate(d: string) {
    setSelectedDate(d);
    setSelectedTime("");
  }

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
        if (data.bookingReference) setBookingReference(data.bookingReference);
        if (data.leadId) setLeadId(data.leadId);
      } else {
        setError(data.error || "Failed to submit booking");
      }
    } catch {
      setError("Something went wrong");
    }
    setSubmitting(false);
  }

  return {
    step,
    goToStep,
    config,
    services,
    loading,
    error,
    submitting,
    submitted,
    confirmMessage,
    bookingReference,
    leadId,
    selectedServices,
    vehicleSize,
    setVehicleSize,
    selectedDate,
    selectedTime,
    setSelectedTime,
    availableSlots,
    slotsLoading,
    slotMessage,
    calendarMonth,
    setCalendarMonth,
    form,
    updateForm,
    servicesByCategory,
    getServicePrice,
    selectedServicesList,
    totalPrice,
    totalMinutes,
    toggleService,
    canProceed,
    handleSelectDate,
    handleSubmit,
  };
}
