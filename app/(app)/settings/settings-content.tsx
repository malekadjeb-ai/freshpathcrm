"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { Save, Download, Database, Mail, MessageSquare, CheckCircle, XCircle, Loader2, Phone, RefreshCw, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface BusinessSettings {
  id: string;
  businessName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  taxRate: number;
  defaultPaymentTerms: string;
  invoiceFooter: string;
  // Communication
  communicationMode?: string;
  emailProvider?: string | null;
  senderEmail?: string | null;
  emailFromName?: string | null;
}

export default function SettingsContent() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, isError, refetch } = useQuery<BusinessSettings>({
    queryKey: ["settings"],
    queryFn: () => fetchJson("/api/settings"),
  });

  const { register, handleSubmit, setValue, watch } = useForm<BusinessSettings>({
    values: settings,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: BusinessSettings) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const exportData = async (type: string) => {
    const res = await fetch(`/api/${type}`);
    const data = await res.json();
    if (!Array.isArray(data)) return;

    const headers = Object.keys(data[0] ?? {}).filter(
      (k) => typeof data[0][k] !== "object"
    );
    const csv = [
      headers.join(","),
      ...data.map((row: Record<string, unknown>) =>
        headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `freshpath-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${type} exported`);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError) return <ErrorState message="Failed to load settings." onRetry={refetch} />;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your business configuration</p>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="data">Data & Export</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Business Information</CardTitle>
                <CardDescription>This information appears on your invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Business Name</Label>
                  <Input {...register("businessName")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input {...register("phone")} placeholder="(832) 555-0192" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input {...register("email")} type="email" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input {...register("website")} placeholder="freshpathmobiledetailing.com" />
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input {...register("address")} />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label>City</Label>
                    <Input {...register("city")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Input {...register("state")} maxLength={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ZIP</Label>
                    <Input {...register("zip")} />
                  </div>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...register("taxRate", { valueAsNumber: true })}
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-400">Set to 0 for no tax</p>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="booking">
          <BookingSettingsPanel />
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewSettingsPanel />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsPanel settings={settings} />
        </TabsContent>

        <TabsContent value="invoicing">
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice Settings</CardTitle>
                <CardDescription>Customize your invoice appearance and defaults</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Default Payment Terms</Label>
                  <Select
                    value={watch("defaultPaymentTerms") ?? "Due on receipt"}
                    onValueChange={(v) => setValue("defaultPaymentTerms", v as string)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Due on completion">Due on completion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Invoice Footer Message</Label>
                  <Textarea
                    {...register("invoiceFooter")}
                    rows={3}
                    placeholder="Thank you for your business!"
                    className="resize-none"
                  />
                </div>
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="expenses">
          <ExpenseSettingsPanel />
        </TabsContent>

        <TabsContent value="data">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Data</CardTitle>
                <CardDescription>Download your data as CSV files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Customers", key: "customers", desc: "All customer records with contact info and LTV" },
                  { label: "Jobs", key: "jobs", desc: "All job records with status and pricing" },
                  { label: "Invoices", key: "invoices", desc: "All invoices with payment status" },
                ].map(({ label, key, desc }) => (
                  <div key={key} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                    <div>
                      <p className="font-medium text-sm text-slate-900">{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportData(key)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Export CSV
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Database</CardTitle>
                <CardDescription>SQLite database management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-sm text-slate-900">SQLite Database</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Local file: <code className="font-mono bg-slate-200 px-1 rounded">prisma/dev.db</code>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Back up this file regularly to preserve your data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Booking Settings Panel ─────────────────────────────────────

function BookingSettingsPanel() {
  const queryClient = useQueryClient();

  const { data: bookingSettings, isLoading } = useQuery<Record<string, unknown>>({
    queryKey: ["booking-settings"],
    queryFn: () => fetchJson("/api/settings"),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-settings"] });
      toast.success("Booking settings saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const days: number[] = [];
    [0, 1, 2, 3, 4, 5, 6].forEach((d) => {
      if (fd.get(`day_${d}`)) days.push(d);
    });
    saveMutation.mutate({
      bookingEnabled: fd.get("bookingEnabled") === "on",
      bookingPageTitle: fd.get("bookingPageTitle") || "Book Your Detail",
      bookingPageDescription: fd.get("bookingPageDescription") || null,
      workingHoursStart: fd.get("workingHoursStart") || "07:00",
      workingHoursEnd: fd.get("workingHoursEnd") || "19:00",
      workingDays: JSON.stringify(days),
      maxJobsPerDay: parseInt(fd.get("maxJobsPerDay") as string) || 8,
      slotDurationMinutes: parseInt(fd.get("slotDurationMinutes") as string) || 60,
      bufferMinutes: parseInt(fd.get("bufferMinutes") as string) || 30,
    });
  };

  if (isLoading) return <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />;

  const bs = bookingSettings as Record<string, unknown> || {};
  const workingDays: number[] = JSON.parse((bs.workingDays as string) || "[1,2,3,4,5,6]");
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Online Booking</CardTitle>
          <CardDescription>Configure your public booking page at /book</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" name="bookingEnabled" defaultChecked={!!bs.bookingEnabled} className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
            <Label>Enable online booking</Label>
          </div>
          <div className="space-y-1.5">
            <Label>Page Title</Label>
            <Input name="bookingPageTitle" defaultValue={(bs.bookingPageTitle as string) || "Book Your Detail"} />
          </div>
          <div className="space-y-1.5">
            <Label>Page Description</Label>
            <Textarea name="bookingPageDescription" defaultValue={(bs.bookingPageDescription as string) || ""} rows={2} />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input name="workingHoursStart" type="time" defaultValue={(bs.workingHoursStart as string) || "07:00"} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input name="workingHoursEnd" type="time" defaultValue={(bs.workingHoursEnd as string) || "19:00"} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Available Days</Label>
            <div className="flex gap-2">
              {DAY_NAMES.map((day, i) => (
                <label key={i} className="flex flex-col items-center gap-1">
                  <input type="checkbox" name={`day_${i}`} defaultChecked={workingDays.includes(i)} className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                  <span className="text-xs text-slate-500">{day}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Max Jobs/Day</Label>
              <Input name="maxJobsPerDay" type="number" min="1" defaultValue={((bs.maxJobsPerDay as number) || 8).toString()} />
            </div>
            <div className="space-y-1.5">
              <Label>Slot Duration (min)</Label>
              <Input name="slotDurationMinutes" type="number" min="15" step="15" defaultValue={((bs.slotDurationMinutes as number) || 60).toString()} />
            </div>
            <div className="space-y-1.5">
              <Label>Buffer (min)</Label>
              <Input name="bufferMinutes" type="number" min="0" step="15" defaultValue={((bs.bufferMinutes as number) || 30).toString()} />
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={saveMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Booking Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// ─── Review Settings Panel ─────────────────────────────────────

function ReviewSettingsPanel() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<Record<string, unknown>>({
    queryKey: ["settings"],
    queryFn: () => fetchJson("/api/settings"),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Review settings saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      googleReviewUrl: fd.get("googleReviewUrl") || null,
      autoRequestReviews: fd.get("autoRequestReviews") === "on",
      reviewRequestDelay: parseInt(fd.get("reviewRequestDelay") as string) || 24,
    });
  };

  if (isLoading) return <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />;

  const bs = settings as Record<string, unknown> || {};

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review Requests</CardTitle>
          <CardDescription>Configure automatic review requests after job completion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Google Review URL</Label>
            <Input name="googleReviewUrl" defaultValue={(bs.googleReviewUrl as string) || ""} placeholder="https://g.page/r/your-business/review" />
            <p className="text-xs text-slate-400">The direct link to your Google Business Profile review form</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" name="autoRequestReviews" defaultChecked={bs.autoRequestReviews !== false} className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
            <Label>Auto-send review requests on job completion</Label>
          </div>
          <div className="space-y-1.5">
            <Label>Request Delay (hours after completion)</Label>
            <select
              name="reviewRequestDelay"
              defaultValue={((bs.reviewRequestDelay as number) || 24).toString()}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="1">1 hour</option>
              <option value="2">2 hours</option>
              <option value="4">4 hours</option>
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
            </select>
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={saveMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Review Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// ─── Integrations Panel ─────────────────────────────────────────

function IntegrationsPanel({ settings }: { settings?: BusinessSettings }) {
  const queryClient = useQueryClient();
  const [emailProvider, setEmailProvider] = useState(settings?.emailProvider || "resend");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);

  // Query comm status
  const { data: commStatus } = useQuery<{ emailConfigured: boolean; smsConfigured: boolean; emailProvider: string | null }>({
    queryKey: ["comm-status"],
    queryFn: () => fetchJson("/api/communications/status"),
  });

  const saveIntegrations = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["comm-status"] });
      toast.success("Integration settings saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const testConnection = async (channel: "email" | "sms") => {
    const to = channel === "email"
      ? settings?.email || ""
      : settings?.phone || "";

    if (!to) {
      toast.error(`No ${channel === "email" ? "email" : "phone"} configured in Business settings`);
      return;
    }

    if (channel === "email") setTestingEmail(true);
    else setTestingSms(true);

    try {
      const res = await fetch("/api/communications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, to }),
      });
      const data = await res.json();

      if (data.success && data.mode === "live") {
        toast.success(`Test ${channel} sent successfully!`);
      } else if (data.success && data.mode === "dev") {
        toast.info(`Test ${channel} logged in dev mode (no API keys configured)`);
      } else {
        toast.error(`Test failed: ${data.error || "Unknown error"}`);
      }
    } catch {
      toast.error("Test request failed");
    } finally {
      if (channel === "email") setTestingEmail(false);
      else setTestingSms(false);
    }
  };

  const handleSubmitIntegrations = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = { emailProvider };

    data.senderEmail = formData.get("senderEmail") || null;
    data.emailFromName = formData.get("emailFromName") || null;

    saveIntegrations.mutate(data);
  };

  return (
    <form onSubmit={handleSubmitIntegrations} className="space-y-4">
      {/* Status overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Communication Status</CardTitle>
          <CardDescription>Current configuration and delivery mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <div className="flex items-center gap-1.5">
                  {commStatus?.emailConfigured ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs text-emerald-600">Connected ({commStatus.emailProvider})</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs text-amber-600">Dev mode (not sending)</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium">SMS</p>
                <div className="flex items-center gap-1.5">
                  {commStatus?.smsConfigured ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs text-emerald-600">Connected (Twilio)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs text-amber-600">Dev mode (not sending)</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          {commStatus && !commStatus.emailConfigured && !commStatus.smsConfigured && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              Messages are being logged but NOT sent. Configure email and SMS below to enable real delivery.
              View logged messages in Communications to see what would have been sent.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Configuration</CardTitle>
          <CardDescription>
            Choose an email provider. Resend offers 100 free emails/day.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email Provider</Label>
            <Select value={emailProvider} onValueChange={(v) => v && setEmailProvider(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resend">Resend (100/day free)</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="smtp">Gmail / Custom SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              API keys are managed via environment variables. Update them in your hosting provider&apos;s settings.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {emailProvider === "resend" && "Set RESEND_API_KEY in your environment."}
              {emailProvider === "sendgrid" && "Set SENDGRID_API_KEY in your environment."}
              {emailProvider === "smtp" && "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in your environment."}
            </p>
          </div>

          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sender Email</Label>
              <Input
                name="senderEmail"
                defaultValue={settings?.senderEmail || ""}
                placeholder="noreply@freshpath.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sender Name</Label>
              <Input
                name="emailFromName"
                defaultValue={settings?.emailFromName || "Fresh Path Mobile Detailing"}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => testConnection("email")}
            disabled={testingEmail}
          >
            {testingEmail ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1.5" />}
            Send Test Email
          </Button>
        </CardContent>
      </Card>

      {/* SMS Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SMS Configuration (Twilio)</CardTitle>
          <CardDescription>
            Twilio free trial includes $15.50 credit — no credit card needed to test.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              API keys are managed via environment variables. Update them in your hosting provider&apos;s settings.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your environment.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => testConnection("sms")}
            disabled={testingSms}
          >
            {testingSms ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5 mr-1.5" />}
            Send Test SMS
          </Button>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={saveIntegrations.isPending}
        className="bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        <Save className="w-4 h-4 mr-2" />
        {saveIntegrations.isPending ? "Saving..." : "Save Integration Settings"}
      </Button>

      {/* Google Voice Sync — separate from form since it uses OAuth */}
      <GoogleVoiceSyncCard />
    </form>
  );
}

function GoogleVoiceSyncCard() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [lookbackDays, setLookbackDays] = useState(7);
  const [lastResult, setLastResult] = useState<{ imported: number; matched: number; created: number; skipped: number; errors: number; total: number } | null>(null);

  const { data: syncStatus, isLoading } = useQuery<{
    connected: boolean;
    email?: string | null;
    syncEnabled?: boolean;
    lastSyncAt?: string | null;
    tokenExpiry?: string | null;
    tokenValid?: boolean;
    totalSynced?: number;
    last24h?: number;
    breakdown?: { calls: number; sms: number; voicemails: number };
  }>({
    queryKey: ["gv-sync-status"],
    queryFn: () => fetchJson("/api/google/sync"),
    refetchInterval: 30000,
  });

  const handleSync = useCallback(async (forceFullSync = false) => {
    setSyncing(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookbackDays, forceFullSync }),
      });
      const data = await res.json();
      if (data.error) {
        if (data.reconnect) {
          toast.error("Google token expired — please reconnect your Google account.");
        } else {
          toast.error(data.error);
        }
      } else {
        setLastResult(data);
        const parts = [];
        if (data.imported > 0) parts.push(`${data.imported} imported`);
        if (data.created > 0) parts.push(`${data.created} new contacts`);
        if (data.matched > 0) parts.push(`${data.matched} matched`);
        if (data.skipped > 0) parts.push(`${data.skipped} skipped`);
        if (data.errors > 0) parts.push(`${data.errors} errors`);
        toast.success(parts.length > 0 ? `Sync complete: ${parts.join(", ")}` : `Sync complete — ${data.total} emails scanned, all up to date`);
        queryClient.invalidateQueries({ queryKey: ["gv-sync-status"] });
        queryClient.invalidateQueries({ queryKey: ["communications"] });
      }
    } catch {
      toast.error("Sync failed — check your internet connection");
    } finally {
      setSyncing(false);
    }
  }, [lookbackDays, queryClient]);

  const handleDisconnect = async () => {
    try {
      await fetch("/api/google/disconnect", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["gv-sync-status"] });
      toast.success("Google account disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  // Auto-sync every 3 minutes when connected
  useEffect(() => {
    if (!syncStatus?.connected) return;

    const interval = setInterval(() => {
      if (!syncing) {
        handleSync();
      }
    }, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [syncStatus?.connected, syncing, handleSync]);

  // Auto-sync on first load if connected
  useEffect(() => {
    if (syncStatus?.connected && !syncing && syncStatus.lastSyncAt) {
      const lastSync = new Date(syncStatus.lastSyncAt).getTime();
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      if (lastSync < fiveMinAgo) {
        handleSync();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncStatus?.connected]);

  const bd = syncStatus?.breakdown;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="w-4 h-4" /> Google Voice Sync
        </CardTitle>
        <CardDescription>
          Import calls, texts, and voicemails from Google Voice via Gmail. Tokens auto-refresh — no need to reconnect.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking connection...
          </div>
        ) : syncStatus?.connected ? (
          <>
            {/* Connection status */}
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Connected</p>
                  <p className="text-xs text-emerald-600">{syncStatus.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-red-500 hover:text-red-700"
                >
                  <Unlink className="w-3.5 h-3.5 mr-1" /> Disconnect
                </Button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-lg font-bold text-slate-900">{syncStatus.totalSynced || 0}</p>
                <p className="text-[10px] text-slate-400">Total Synced</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-lg font-bold text-blue-600">{bd?.calls || 0}</p>
                <p className="text-[10px] text-blue-400">Calls</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-lg font-bold text-green-600">{bd?.sms || 0}</p>
                <p className="text-[10px] text-green-400">Texts</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2">
                <p className="text-lg font-bold text-amber-600">{bd?.voicemails || 0}</p>
                <p className="text-[10px] text-amber-400">Voicemails</p>
              </div>
            </div>

            {/* Last sync result */}
            {lastResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <p className="font-medium">Last sync result:</p>
                <p>Scanned {lastResult.total} emails — {lastResult.imported} new, {lastResult.matched} matched to existing customers, {lastResult.created} new contacts created{lastResult.errors > 0 ? `, ${lastResult.errors} errors` : ""}</p>
              </div>
            )}

            {/* Sync controls */}
            <div className="flex items-center gap-2">
              <Select
                value={String(lookbackDays)}
                onValueChange={(v) => v && setLookbackDays(parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="3">Last 3 days</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={() => handleSync(false)}
                disabled={syncing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {syncing ? "Syncing..." : "Sync Now"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSync(true)}
                disabled={syncing}
              >
                Full Re-sync
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Auto-syncs every 3 min while this page is open.
                Last sync: {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString() : "Never"}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Not connected */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
              <Phone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">Google Voice Not Connected</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Connect your Google account to automatically track every call, text, and voicemail from Google Voice in your CRM.
              </p>
              <a
                href="/api/google/connect"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <Mail className="w-4 h-4" />
                Connect Google Account
              </a>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500 space-y-3">
              <div>
                <p className="font-semibold text-slate-700 mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Connect your Google account (read-only Gmail access)</li>
                  <li>We scan for notification emails from Google Voice</li>
                  <li>Calls, texts, and voicemails are parsed and imported</li>
                  <li>Contacts are auto-matched or created in your CRM</li>
                  <li>Tokens auto-refresh — connect once, stays connected</li>
                </ol>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-1">What gets tracked:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Incoming & outgoing calls (with duration)</li>
                  <li>Missed calls</li>
                  <li>SMS text messages (full content)</li>
                  <li>Voicemails (with transcripts)</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-1">Requirements:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Google Voice email notifications enabled in Google Voice settings</li>
                  <li><code className="bg-slate-200 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-slate-200 px-1 rounded">GOOGLE_CLIENT_SECRET</code> in .env</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Expense Settings Panel ─────────────────────────────────────

function ExpenseSettingsPanel() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<Record<string, unknown>>({
    queryKey: ["expense-settings"],
    queryFn: () => fetchJson("/api/settings"),
  });

  const [autoEnabled, setAutoEnabled] = useState(true);
  const [mileageRate, setMileageRate] = useState("0.67");
  const [autoMileage, setAutoMileage] = useState(true);
  const [autoSupplies, setAutoSupplies] = useState(true);
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setAutoEnabled(settings.autoExpenseEnabled !== false);
    setMileageRate(String(settings.mileageRate ?? "0.67"));
    setAutoMileage(settings.autoExpenseMileage !== false);
    setAutoSupplies(settings.autoExpenseSupplies !== false);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoExpenseEnabled: autoEnabled,
          mileageRate: parseFloat(mileageRate) || 0.67,
          autoExpenseMileage: autoMileage,
          autoExpenseSupplies: autoSupplies,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["expense-settings"] });
      toast.success("Expense settings saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  if (isLoading) return <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Expense Tracking</CardTitle>
          <CardDescription>
            Automatically log expenses when jobs are completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoExpenseEnabled"
              checked={autoEnabled}
              onChange={(e) => setAutoEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
            />
            <Label htmlFor="autoExpenseEnabled">Enable auto-expense tracking on job completion</Label>
          </div>

          {autoEnabled && (
            <div className="ml-7 space-y-4 border-l-2 border-slate-100 pl-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoMileage"
                  checked={autoMileage}
                  onChange={(e) => setAutoMileage(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <Label htmlFor="autoMileage">Auto-log mileage expenses</Label>
                  <p className="text-xs text-slate-400">Creates a fuel expense based on miles driven per job</p>
                </div>
              </div>

              {autoMileage && (
                <div className="ml-7 space-y-1.5">
                  <Label>Mileage Rate ($/mile)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={mileageRate}
                    onChange={(e) => setMileageRate(e.target.value)}
                    className="w-32"
                  />
                  <p className="text-xs text-slate-400">2024 IRS standard rate: $0.67/mile</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoSupplies"
                  checked={autoSupplies}
                  onChange={(e) => setAutoSupplies(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <Label htmlFor="autoSupplies">Auto-log supply costs</Label>
                  <p className="text-xs text-slate-400">Creates a supplies expense based on each service&apos;s supply cost (set in Services settings)</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Expense Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recurring Expenses</CardTitle>
          <CardDescription>
            Expenses marked as &quot;recurring&quot; are automatically duplicated each month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Mark any expense as recurring in the Expenses page, and it will be auto-generated monthly.
            Recurring expenses are processed daily via the cron endpoint.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
