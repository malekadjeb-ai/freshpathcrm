"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensors,
  useSensor,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Plus,
  Search,
  Phone,
  User,
  ArrowRight,
  X,
  Clock,
  AlertTriangle,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { cn, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  sourceDetail: string | null;
  status: string;
  lostReason: string | null;
  lostNotes: string | null;
  notes: string | null;
  vehicleInfo: string | null;
  address: string | null;
  city: string | null;
  priority: string;
  customerId: string | null;
  customer: { id: string; name: string } | null;
  createdAt: string;
  contactedAt: string | null;
  convertedAt: string | null;
  lostAt: string | null;
}

const SOURCES = [
  "Google", "Google LSA", "Google Voice", "Google Ads", "Instagram", "Facebook",
  "Referral", "Yelp", "Nextdoor", "Walk-in", "Flyer", "Website", "TikTok",
  "Door Hanger", "HOA", "Fleet", "Other",
];


const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
};

const PIPELINE_STATUSES = ["New", "Contacted", "Quoted", "Booked"];

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "", phone: "", email: "", source: "Google" as string,
    sourceDetail: "", vehicleInfo: "", address: "", city: "",
    notes: "", priority: "medium",
  });
  const [lostReason, setLostReason] = useState("Price");
  const [lostNotes, setLostNotes] = useState("");

  const { data: leads = [], isLoading, isError, refetch } = useQuery<Lead[]>({
    queryKey: ["leads", filterStatus, filterSource],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterSource) params.set("source", filterSource);
      return fetchJson(`/api/leads?${params}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead created");
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to create lead"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated");
    },
    onError: () => toast.error("Failed to update lead"),
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads/${id}/convert`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`Converted to customer: ${customer.name}`);
    },
    onError: () => toast.error("Failed to convert lead"),
  });


  const filteredLeads = leads.filter((l) =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search) || l.email?.toLowerCase().includes(search.toLowerCase())
  );

  const pipelineLeads = PIPELINE_STATUSES.map((status) => ({
    status,
    leads: filteredLeads.filter((l) => l.status === status),
  }));

  const lostLeads = filteredLeads.filter((l) => l.status === "Lost");
  const newLeadCount = leads.filter((l) => l.status === "New").length;

  // DnD state
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragStart(event: DragStartEvent) {
    const lead = filteredLeads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = active.id as string;
    const newStatus = over.id as string;
    const lead = filteredLeads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    updateMutation.mutate({ id: leadId, data: { status: newStatus } });
  }

  function openCreate() {
    setForm({
      name: "", phone: "", email: "", source: "Google",
      sourceDetail: "", vehicleInfo: "", address: "", city: "",
      notes: "", priority: "medium",
    });
    setDialogOpen(true);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  function markLost() {
    if (!selectedLead) return;
    updateMutation.mutate({
      id: selectedLead.id,
      data: { status: "Lost", lostReason, lostNotes: lostNotes || null },
    });
    setLostDialogOpen(false);
    setSelectedLead(null);
  }

  if (isError) return <ErrorState message="Failed to load leads." onRetry={refetch} />;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Leads
            {newLeadCount > 0 && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {newLeadCount} new
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {leads.length} total leads
          </p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={openCreate}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v ?? "")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["New", "Contacted", "Quoted", "Booked", "Lost"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={(v) => setFilterSource(v === "all" ? "" : v ?? "")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline view */}
      {filteredLeads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Create your first lead to start tracking your pipeline"
          actionLabel="New Lead"
          onAction={openCreate}
        />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {pipelineLeads.map(({ status, leads: columnLeads }) => (
              <DroppableColumn key={status} id={status} label={status} count={columnLeads.length}>
                {columnLeads.map((lead) => (
                  <DraggableLeadCard
                    key={lead.id}
                    lead={lead}
                    onStatusChange={(s) =>
                      updateMutation.mutate({ id: lead.id, data: { status: s } })
                    }
                    onConvert={() => convertMutation.mutate(lead.id)}
                    onMarkLost={() => {
                      setSelectedLead(lead);
                      setLostDialogOpen(true);
                    }}
                  />
                ))}
                {columnLeads.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No leads
                  </p>
                )}
              </DroppableColumn>
            ))}
          </div>
          <DragOverlay>
            {activeLead && (
              <div className="rotate-2 opacity-90 bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
                <LeadCardContent lead={activeLead} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Lost leads section */}
      {lostLeads.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-sm text-slate-500 mb-3 flex items-center gap-2">
            <X className="w-4 h-4" />
            Lost ({lostLeads.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {lostLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-red-50 border border-red-100 rounded-lg p-3 opacity-70"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-slate-700">{lead.name}</span>
                  <Badge className="text-xs bg-red-100 text-red-600">{lead.lostReason}</Badge>
                </div>
                {lead.vehicleInfo && (
                  <p className="text-xs text-slate-500 mt-1">{lead.vehicleInfo}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Lead Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Source *</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm({ ...form, source: v ?? "Google" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v ?? "medium" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Source Detail</Label>
              <Input
                value={form.sourceDetail}
                onChange={(e) => setForm({ ...form, sourceDetail: e.target.value })}
                placeholder="e.g., Referred by John Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle Info</Label>
              <Input
                value={form.vehicleInfo}
                onChange={(e) => setForm({ ...form, vehicleInfo: e.target.value })}
                placeholder="e.g., 2022 Tesla Model Y, white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-lg"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Lead"}
              </Button>
              <Button
                type="button"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-6 py-2.5 rounded-lg border border-slate-300"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark as Lost Dialog */}
      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Lead as Lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={lostReason} onValueChange={(v) => setLostReason(v ?? "Price")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Price", "Timing", "No Response", "Competitor", "Not Interested", "Other"].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button
                onClick={markLost}
                className="bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-2.5 rounded-lg"
                disabled={updateMutation.isPending}
              >
                Mark as Lost
              </Button>
              <Button
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-6 py-2.5 rounded-lg border border-slate-300"
                onClick={() => setLostDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Droppable Column ─────────────────────────────────────── */
function DroppableColumn({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-slate-50 rounded-xl p-3 transition-colors",
        isOver && "bg-emerald-50 ring-2 ring-emerald-200"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-slate-700">{label}</h3>
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/* ── Lead Card Content (presentation only) ───────────────── */
function LeadCardContent({ lead }: { lead: Lead }) {
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <span className="font-medium text-sm text-slate-900">{lead.name}</span>
        <Badge className={cn("text-xs", PRIORITY_COLORS[lead.priority])}>
          {lead.priority}
        </Badge>
      </div>
      {lead.vehicleInfo && (
        <p className="text-xs text-slate-500 mb-1">{lead.vehicleInfo}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
        <span className={cn(
          "px-1.5 py-0.5 rounded",
          lead.source === "Google LSA" ? "bg-green-100 text-green-700 font-medium" : "bg-slate-100 text-slate-600"
        )}>
          {lead.source}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {daysSinceCreated}d ago
        </span>
      </div>
      {lead.phone && (
        <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
          <Phone className="w-3 h-3" /> {lead.phone}
        </p>
      )}
      {lead.notes && (
        <p className="text-xs text-slate-400 line-clamp-2 mt-1">
          {lead.notes}
        </p>
      )}
    </div>
  );
}

/* ── Draggable Lead Card ─────────────────────────────────── */
function DraggableLeadCard({
  lead,
  onStatusChange,
  onConvert,
  onMarkLost,
}: {
  lead: Lead;
  onStatusChange: (status: string) => void;
  onConvert: () => void;
  onMarkLost: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(isDragging && "opacity-40")}
    >
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-1">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <LeadCardContent lead={lead} />
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
          {lead.status === "New" && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onStatusChange("Contacted")}
              className="text-xs"
            >
              Mark Contacted
            </Button>
          )}
          {lead.status === "Contacted" && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onStatusChange("Quoted")}
              className="text-xs"
            >
              Mark Quoted
            </Button>
          )}
          {(lead.status === "Quoted" || lead.status === "Contacted") && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onConvert}
              className="text-xs text-emerald-600 hover:text-emerald-700"
            >
              <ArrowRight className="w-3 h-3 mr-1" />
              Convert
            </Button>
          )}
          {lead.status !== "Booked" && lead.status !== "Lost" && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onMarkLost}
              className="text-xs text-red-400 hover:text-red-600 ml-auto"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Lost
            </Button>
          )}
          {lead.status === "Booked" && lead.customer && (
            <Link href={`/customers/${lead.customer.id}`}>
              <Button variant="ghost" size="xs" className="text-xs text-emerald-600">
                <User className="w-3 h-3 mr-1" />
                View Customer
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
