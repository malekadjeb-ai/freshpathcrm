"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sparkles,
  Building2,
  Wrench,
  Users,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

interface ServiceRow {
  name: string;
  basePrice: number;
}

const DEFAULT_SERVICES: ServiceRow[] = [
  { name: "Exterior Wash", basePrice: 50 },
  { name: "Interior Detail", basePrice: 80 },
  { name: "Full Detail", basePrice: 150 },
  { name: "Ceramic Coating", basePrice: 350 },
  { name: "Paint Correction", basePrice: 200 },
];

const STEPS = [
  { title: "Welcome", icon: Sparkles },
  { title: "Business Info", icon: Building2 },
  { title: "Services", icon: Wrench },
  { title: "First Customer", icon: Users },
  { title: "Booking Page", icon: Calendar },
  { title: "All Done!", icon: CheckCircle2 },
];

export function OnboardingWizard({ open, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Business Info
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  // Step 2: Services
  const [services, setServices] = useState<ServiceRow[]>(() =>
    DEFAULT_SERVICES.map((s) => ({ ...s }))
  );

  // Step 3: First Customer
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");

  // Step 4: Booking Page
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [workingHoursStart, setWorkingHoursStart] = useState("07:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("19:00");

  function updateService(index: number, field: keyof ServiceRow, value: string | number) {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  function addService() {
    setServices((prev) => [...prev, { name: "", basePrice: 0 }]);
  }

  async function saveBusinessInfo() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          phone: businessPhone,
          email: businessEmail,
          address: businessAddress,
        }),
      });
      if (!res.ok) throw new Error("Failed to save business info");
      toast.success("Business info saved!");
    } catch {
      toast.error("Failed to save business info");
      throw new Error("save failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveServices() {
    setLoading(true);
    try {
      const validServices = services.filter((s) => s.name.trim());
      for (const service of validServices) {
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: service.name,
            basePrice: service.basePrice,
            category: "Service",
            isActive: true,
          }),
        });
        if (!res.ok) throw new Error(`Failed to save service: ${service.name}`);
      }
      toast.success(`${validServices.length} services saved!`);
    } catch {
      toast.error("Failed to save services");
      throw new Error("save failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveCustomer() {
    setLoading(true);
    try {
      const customerRes = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
        }),
      });
      if (!customerRes.ok) throw new Error("Failed to create customer");
      const customer = await customerRes.json();

      if (vehicleMake.trim() && vehicleModel.trim() && vehicleYear.trim()) {
        const vehicleRes = await fetch(`/api/customers/${customer.id}/vehicles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            make: vehicleMake,
            model: vehicleModel,
            year: parseInt(vehicleYear, 10),
            vehicleType: "Sedan",
          }),
        });
        if (!vehicleRes.ok) throw new Error("Failed to add vehicle");
      }

      toast.success("Customer created!");
    } catch {
      toast.error("Failed to create customer");
      throw new Error("save failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveBookingSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingEnabled,
          workingHoursStart,
          workingHoursEnd,
        }),
      });
      if (!res.ok) throw new Error("Failed to save booking settings");
      toast.success("Booking settings saved!");
    } catch {
      toast.error("Failed to save booking settings");
      throw new Error("save failed");
    } finally {
      setLoading(false);
    }
  }

  async function markSetupComplete() {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupComplete: true }),
      });
    } catch {
      // non-critical
    }
  }

  async function handleNext() {
    try {
      if (step === 1) {
        if (businessName.trim()) {
          await saveBusinessInfo();
        }
      } else if (step === 2) {
        const validServices = services.filter((s) => s.name.trim());
        if (validServices.length > 0) {
          await saveServices();
        }
      } else if (step === 3) {
        if (customerName.trim()) {
          await saveCustomer();
        }
      } else if (step === 4) {
        await saveBookingSettings();
      }
      if (step === 4) {
        await markSetupComplete();
      }
      setStep((s) => s + 1);
    } catch {
      // error already toasted
    }
  }

  function handleSkip() {
    if (step === 4) {
      markSetupComplete();
    }
    setStep((s) => s + 1);
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto !p-0 !gap-0"
        showCloseButton={false}
      >
        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-t-lg">
          <div
            className="bg-emerald-500 h-1.5 rounded-t-lg transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                i < step
                  ? "bg-emerald-500 text-white"
                  : i === step
                    ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500"
                    : "bg-slate-100 text-slate-400"
              )}
            >
              {i < step ? "\u2713" : i + 1}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="p-6">
          {step === 0 && <WelcomeStep />}
          {step === 1 && (
            <BusinessInfoStep
              businessName={businessName}
              setBusinessName={setBusinessName}
              businessPhone={businessPhone}
              setBusinessPhone={setBusinessPhone}
              businessEmail={businessEmail}
              setBusinessEmail={setBusinessEmail}
              businessAddress={businessAddress}
              setBusinessAddress={setBusinessAddress}
            />
          )}
          {step === 2 && (
            <ServicesStep
              services={services}
              updateService={updateService}
              removeService={removeService}
              addService={addService}
            />
          )}
          {step === 3 && (
            <FirstCustomerStep
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              customerEmail={customerEmail}
              setCustomerEmail={setCustomerEmail}
              vehicleMake={vehicleMake}
              setVehicleMake={setVehicleMake}
              vehicleModel={vehicleModel}
              setVehicleModel={setVehicleModel}
              vehicleYear={vehicleYear}
              setVehicleYear={setVehicleYear}
            />
          )}
          {step === 4 && (
            <BookingStep
              bookingEnabled={bookingEnabled}
              setBookingEnabled={setBookingEnabled}
              workingHoursStart={workingHoursStart}
              setWorkingHoursStart={setWorkingHoursStart}
              workingHoursEnd={workingHoursEnd}
              setWorkingHoursEnd={setWorkingHoursEnd}
            />
          )}
          {step === 5 && <DoneStep onComplete={onComplete} />}
        </div>

        {/* Navigation */}
        <div className="px-6 pb-6 flex items-center justify-between gap-2">
          {step > 0 && step < 5 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step > 0 && step < 5 && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-slate-400"
                disabled={loading}
              >
                Skip
              </Button>
            )}
            {step < 5 && (
              <Button
                onClick={handleNext}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {step === 0 ? "Get Started" : "Continue"}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Step Components ───────────────────────────────────────────

function WelcomeStep() {
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        Welcome to Fresh Path CRM
      </h2>
      <p className="text-slate-500 max-w-md mx-auto">
        Let&apos;s get your business set up in just a few steps. You can always
        change these settings later.
      </p>
    </div>
  );
}

function BusinessInfoStep({
  businessName,
  setBusinessName,
  businessPhone,
  setBusinessPhone,
  businessEmail,
  setBusinessEmail,
  businessAddress,
  setBusinessAddress,
}: {
  businessName: string;
  setBusinessName: (v: string) => void;
  businessPhone: string;
  setBusinessPhone: (v: string) => void;
  businessEmail: string;
  setBusinessEmail: (v: string) => void;
  businessAddress: string;
  setBusinessAddress: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Business Info</h2>
          <p className="text-sm text-slate-500">Tell us about your business</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="ob-biz-name">Company Name</Label>
          <Input
            id="ob-biz-name"
            placeholder="Fresh Path Mobile Detailing"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ob-biz-phone">Phone</Label>
            <Input
              id="ob-biz-phone"
              placeholder="(555) 123-4567"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ob-biz-email">Email</Label>
            <Input
              id="ob-biz-email"
              type="email"
              placeholder="info@freshpath.com"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="ob-biz-address">Address</Label>
          <Input
            id="ob-biz-address"
            placeholder="123 Main St, Richmond, TX 77406"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function ServicesStep({
  services,
  updateService,
  removeService,
  addService,
}: {
  services: ServiceRow[];
  updateService: (index: number, field: keyof ServiceRow, value: string | number) => void;
  removeService: (index: number) => void;
  addService: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Services</h2>
          <p className="text-sm text-slate-500">
            Set up the services you offer. We&apos;ve added some defaults to get you started.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {services.map((service, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Service name"
                  value={service.name}
                  onChange={(e) => updateService(i, "name", e.target.value)}
                />
              </div>
              <div className="w-28">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    className="pl-7"
                    value={service.basePrice}
                    onChange={(e) =>
                      updateService(i, "basePrice", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeService(i)}
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        className="mt-3 w-full"
        onClick={addService}
      >
        <Plus className="w-4 h-4 mr-2" /> Add Service
      </Button>
    </div>
  );
}

function FirstCustomerStep({
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  vehicleMake,
  setVehicleMake,
  vehicleModel,
  setVehicleModel,
  vehicleYear,
  setVehicleYear,
}: {
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  customerEmail: string;
  setCustomerEmail: (v: string) => void;
  vehicleMake: string;
  setVehicleMake: (v: string) => void;
  vehicleModel: string;
  setVehicleModel: (v: string) => void;
  vehicleYear: string;
  setVehicleYear: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
          <Users className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">First Customer</h2>
          <p className="text-sm text-slate-500">
            Add your first customer to get started
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="ob-cust-name">Customer Name</Label>
          <Input
            id="ob-cust-name"
            placeholder="John Smith"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ob-cust-phone">Phone</Label>
            <Input
              id="ob-cust-phone"
              placeholder="(555) 987-6543"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ob-cust-email">Email</Label>
            <Input
              id="ob-cust-email"
              type="email"
              placeholder="john@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <Label className="text-sm font-medium text-slate-700 mb-3 block">
            Vehicle (optional)
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="ob-veh-make">Make</Label>
              <Input
                id="ob-veh-make"
                placeholder="Toyota"
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ob-veh-model">Model</Label>
              <Input
                id="ob-veh-model"
                placeholder="Camry"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ob-veh-year">Year</Label>
              <Input
                id="ob-veh-year"
                type="number"
                placeholder="2024"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingStep({
  bookingEnabled,
  setBookingEnabled,
  workingHoursStart,
  setWorkingHoursStart,
  workingHoursEnd,
  setWorkingHoursEnd,
}: {
  bookingEnabled: boolean;
  setBookingEnabled: (v: boolean) => void;
  workingHoursStart: string;
  setWorkingHoursStart: (v: string) => void;
  workingHoursEnd: string;
  setWorkingHoursEnd: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Booking Page</h2>
          <p className="text-sm text-slate-500">
            Let customers book appointments online
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Enable Online Booking</p>
              <p className="text-sm text-slate-500">
                Customers can book directly from your booking page
              </p>
            </div>
            <Switch
              checked={bookingEnabled}
              onCheckedChange={setBookingEnabled}
            />
          </div>
        </Card>

        <div>
          <Label className="text-sm font-medium text-slate-700 mb-3 block">
            Working Hours
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ob-hours-start">Start Time</Label>
              <Input
                id="ob-hours-start"
                type="time"
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ob-hours-end">End Time</Label>
              <Input
                id="ob-hours-end"
                type="time"
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DoneStep({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();

  return (
    <div className="text-center py-8 relative overflow-hidden">
      {/* Celebration dots */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full animate-bounce"
            style={{
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
              backgroundColor:
                i % 3 === 0
                  ? "#10b981"
                  : i % 3 === 1
                    ? "#6ee7b7"
                    : "#a7f3d0",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
              opacity: 0.6 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6 animate-pulse">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Your CRM is ready!
        </h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          You&apos;re all set to manage customers, schedule jobs, and grow your
          business.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <Button
            variant="outline"
            onClick={() => {
              onComplete();
              router.push("/customers");
            }}
          >
            <Users className="w-4 h-4 mr-2" /> Add Customer
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onComplete();
              router.push("/jobs/new");
            }}
          >
            <Wrench className="w-4 h-4 mr-2" /> Schedule a Job
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onComplete();
              router.push("/calendar");
            }}
          >
            <Calendar className="w-4 h-4 mr-2" /> View Calendar
          </Button>
        </div>

        <Button
          onClick={onComplete}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
