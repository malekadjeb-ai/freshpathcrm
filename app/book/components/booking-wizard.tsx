"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBooking } from "../hooks/use-booking";
import { ServiceStep } from "./service-step";
import { VehicleStep } from "./vehicle-step";
import { ScheduleStep } from "./schedule-step";
import { ContactStep } from "./contact-step";
import { ConfirmStep } from "./confirm-step";
import { BookingSuccess } from "./booking-success";
import { STEPS } from "./types";

export function BookingWizard() {
  const booking = useBooking();
  const {
    step,
    goToStep,
    config,
    loading,
    error,
    submitting,
    submitted,
    confirmMessage,
    bookingReference,
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
  } = booking;

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
          <h1 className="text-xl font-bold text-slate-900 mb-2">Booking Unavailable</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <BookingSuccess
        confirmMessage={confirmMessage}
        bookingReference={bookingReference}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        selectedServicesList={selectedServicesList}
        totalPrice={totalPrice}
        form={form}
        config={config}
      />
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
              <span
                className={cn(
                  "text-[11px] font-medium hidden sm:block truncate",
                  i === step
                    ? "text-emerald-400"
                    : i < step
                    ? "text-slate-500"
                    : "text-slate-600"
                )}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1 mx-1",
                    i < step ? "bg-emerald-500/50" : "bg-slate-800"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-2xl mx-auto px-4 pb-32">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-6">
          {step === 0 && (
            <ServiceStep
              servicesByCategory={servicesByCategory}
              selectedServices={selectedServices}
              vehicleSize={vehicleSize}
              getServicePrice={getServicePrice}
              onToggle={toggleService}
            />
          )}
          {step === 1 && (
            <VehicleStep
              form={form}
              vehicleSize={vehicleSize}
              selectedServicesList={selectedServicesList}
              getServicePrice={getServicePrice}
              onVehicleSizeChange={setVehicleSize}
              onFormChange={updateForm}
            />
          )}
          {step === 2 && (
            <ScheduleStep
              calendarMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              selectedTime={selectedTime}
              onSelectTime={setSelectedTime}
              availableSlots={availableSlots}
              slotsLoading={slotsLoading}
              slotMessage={slotMessage}
              workingDays={config?.workingDays || [1, 2, 3, 4, 5, 6]}
            />
          )}
          {step === 3 && (
            <ContactStep form={form} onFormChange={updateForm} />
          )}
          {step === 4 && (
            <ConfirmStep
              form={form}
              vehicleSize={vehicleSize}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              selectedServicesList={selectedServicesList}
              totalPrice={totalPrice}
              totalMinutes={totalMinutes}
              error={error}
              getServicePrice={getServicePrice}
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
            {step > 0 ? (
              <Button variant="outline" onClick={() => goToStep(step - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : (
              <div />
            )}
            {step < 4 ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                disabled={!canProceed()}
                onClick={() => goToStep(step + 1)}
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
                {selectedServices.length} service{selectedServices.length > 1 ? "s" : ""} &middot;
                ~{totalMinutes} min
              </div>
              <div className="text-white font-bold text-lg">${totalPrice.toFixed(2)}</div>
            </div>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
              disabled={!canProceed()}
              onClick={() => (step < 4 ? goToStep(step + 1) : handleSubmit())}
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
