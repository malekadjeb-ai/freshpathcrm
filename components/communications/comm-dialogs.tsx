"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MessageSquare, Mail, Send, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { communicationSchema, type CommunicationInput } from "@/lib/validations/communication";
import { formatDate, fetchJson } from "@/lib/utils";
import { TYPE_ICONS, TYPE_LABELS } from "./comm-table";
import type { Communication, CustomerOption, JobOption } from "./comm-types";

interface LogCommunicationDialogProps {
  open: boolean;
  onClose: () => void;
  editComm: Communication | null;
}

export function LogCommunicationDialog({ open, onClose, editComm }: LogCommunicationDialogProps) {
  const queryClient = useQueryClient();
  const [customerSearch, setCustomerSearch] = useState("");

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ["customers-search", customerSearch],
    queryFn: () =>
      fetchJson<CustomerOption[]>(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
        .then((data) => data.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }))),
    enabled: open,
  });

  const {
    register, handleSubmit, control, watch, reset,
    formState: { errors },
  } = useForm<CommunicationInput>({
    resolver: zodResolver(communicationSchema),
    defaultValues: editComm
      ? {
          customerId: editComm.customerId,
          type: editComm.type as CommunicationInput["type"],
          direction: editComm.direction as CommunicationInput["direction"],
          status: editComm.status as CommunicationInput["status"],
          summary: editComm.summary || "",
          duration: editComm.duration,
          jobId: editComm.jobId,
        }
      : {
          type: "call", direction: "outbound", status: "completed",
          customerId: "", summary: "", duration: null, jobId: null,
        },
  });

  const selectedType = watch("type");
  const selectedCustomerId = watch("customerId");

  const { data: customerJobs = [] } = useQuery<JobOption[]>({
    queryKey: ["customer-jobs", selectedCustomerId],
    queryFn: () => fetchJson(`/api/jobs?customerId=${selectedCustomerId}`),
    enabled: !!selectedCustomerId,
  });

  const mutation = useMutation({
    mutationFn: async (data: CommunicationInput) => {
      const url = editComm ? `/api/communications/${editComm.id}` : "/api/communications";
      const method = editComm ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      toast.success(editComm ? "Communication updated" : "Communication logged");
      reset();
      onClose();
    },
    onError: () => toast.error(editComm ? "Failed to update" : "Failed to log communication"),
  });

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editComm ? "Edit Communication" : "Log Communication"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search customers..." className="h-7 text-xs" />
                    </div>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `— ${c.phone}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customerId && <p className="text-red-500 text-xs">{errors.customerId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Type *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                  {(["call", "sms", "email", "voicemail", "note"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => field.onChange(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                        field.value === t ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {TYPE_ICONS[t]}
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Controller name="direction" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "outbound")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller name="status" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "completed")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="no-answer">No Answer</SelectItem>
                    <SelectItem value="voicemail">Voicemail</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          {selectedType === "call" && (
            <div className="space-y-1.5">
              <Label>Duration (seconds)</Label>
              <Input type="number" {...register("duration", { valueAsNumber: true })} placeholder="e.g. 120" />
            </div>
          )}

          {selectedCustomerId && customerJobs.length > 0 && (
            <div className="space-y-1.5">
              <Label>Linked Job (optional)</Label>
              <Controller name="jobId" control={control} render={({ field }) => (
                <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {customerJobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{j.status} — {j.scheduledAt ? formatDate(j.scheduledAt) : "Unscheduled"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Summary</Label>
            <Textarea {...register("summary")} placeholder="What was discussed..." rows={3} />
          </div>

          <div className="space-y-1.5">
            <Label>Date & Time (defaults to now)</Label>
            <Input type="datetime-local" {...register("createdAt")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {mutation.isPending ? (editComm ? "Saving..." : "Logging...") : (editComm ? "Save Changes" : "Log Communication")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SendMessageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ["customers-search", customerSearch],
    queryFn: () =>
      fetchJson<CustomerOption[]>(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
        .then((data) => data.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }))),
    enabled: open,
  });

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const autoTo = channel === "sms" ? selectedCustomer?.phone : selectedCustomer?.email;

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/communications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, to: to || autoTo, subject: channel === "email" ? subject : undefined, message, customerId: customerId || undefined }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to send"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      if (data.mode === "dev") {
        toast.success("Message logged (dev mode — configure provider in Settings > Integrations)");
      } else {
        toast.success(`${channel === "sms" ? "SMS" : "Email"} sent successfully!`);
      }
      resetForm(); onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send"),
  });

  const resetForm = () => { setChannel("sms"); setCustomerId(""); setTo(""); setSubject(""); setMessage(""); };

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-500" />
            Send Message
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button type="button" onClick={() => setChannel("sms")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${channel === "sms" ? "bg-green-50 text-green-700" : "text-slate-500 hover:bg-slate-50"}`}>
              <MessageSquare className="w-4 h-4" /> SMS
            </button>
            <button type="button" onClick={() => setChannel("email")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${channel === "email" ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:bg-slate-50"}`}>
              <Mail className="w-4 h-4" /> Email
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select customer (optional)" /></SelectTrigger>
              <SelectContent>
                <div className="p-2"><Input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search..." className="h-7 text-xs" /></div>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {channel === "sms" ? c.phone ? `— ${c.phone}` : "(no phone)" : c.email ? `— ${c.email}` : "(no email)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{channel === "sms" ? "Phone Number" : "Email Address"} *</Label>
            <Input value={to || autoTo || ""} onChange={(e) => setTo(e.target.value)} placeholder={channel === "sms" ? "+15551234567" : "customer@email.com"} />
          </div>

          {channel === "email" && (
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Message *</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={channel === "sms" ? "Hi {{customer_first_name}}, ..." : "Write your email..."} rows={4} />
            <p className="text-xs text-slate-400">Supports template variables: {"{{customer_name}}, {{business_name}}, {{job_date}}"}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
            <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !message.trim() || !(to || autoTo)} className="bg-blue-500 hover:bg-blue-600 text-white">
              {sendMutation.isPending ? "Sending..." : `Send ${channel === "sms" ? "SMS" : "Email"}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MakeCallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [phone, setPhone] = useState("");

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ["customers-search-call", customerSearch],
    queryFn: () =>
      fetchJson<CustomerOption[]>(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
        .then((data) => data.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }))),
    enabled: open,
  });

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const autoPhone = selectedCustomer?.phone || "";

  const callMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, to: phone || autoPhone }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to initiate call"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      if (data.mode === "dev") {
        toast.success("Call logged (dev mode — configure Twilio in Settings > Integrations)");
      } else {
        toast.success("Call initiated via Twilio!");
      }
      setCustomerId(""); setPhone(""); onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Call failed"),
  });

  return (
    <Dialog open={open} onOpenChange={() => { setCustomerId(""); setPhone(""); onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-blue-500" />
            Make a Call
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                <div className="p-2"><Input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search..." className="h-7 text-xs" /></div>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `— ${c.phone}` : "(no phone)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Phone Number *</Label>
            <Input value={phone || autoPhone} onChange={(e) => setPhone(e.target.value)} placeholder="+15551234567" />
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>With Twilio configured: Places a real call through your Twilio number</li>
              <li>Without Twilio: Logs the call for your records (dev mode)</li>
              <li>All calls are recorded and tracked automatically</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCustomerId(""); setPhone(""); onClose(); }}>Cancel</Button>
            <Button onClick={() => callMutation.mutate()} disabled={callMutation.isPending || !customerId || !(phone || autoPhone)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {callMutation.isPending ? "Calling..." : "Start Call"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
