"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Plus,
  Search,
  Send,
  Users,
  Mail,
  MessageSquare,
  Calendar,
  BarChart2,
  Trash2,
  Edit2,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  subject: string | null;
  body: string;
  targetCriteria: string;
  audienceCount: number;
  sentCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  convertedCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface AudiencePreview {
  count: number;
  sample: { id: string; name: string; phone: string | null; email: string | null }[];
}

const statusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Scheduled: "bg-blue-100 text-blue-700",
  Sending: "bg-yellow-100 text-yellow-700",
  Sent: "bg-emerald-100 text-emerald-700",
  Paused: "bg-orange-100 text-orange-700",
  Cancelled: "bg-red-100 text-red-700",
};

const typeIcons: Record<string, React.ReactNode> = {
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  both: <Send className="w-3.5 h-3.5" />,
};

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"sms" | "email" | "both">("sms");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Audience criteria
  const [criteriaCity, setCriteriaCity] = useState("");
  const [criteriaStage, setCriteriaStage] = useState("");
  const [criteriaSource, setCriteriaSource] = useState("");

  // Audience preview
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);

  const { data: campaigns = [], isLoading, isError, refetch } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => fetchJson("/api/campaigns"),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = editing ? `/api/campaigns/${editing.id}` : "/api/campaigns";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(editing ? "Campaign updated" : "Campaign created");
      closeDialog();
    },
    onError: () => toast.error("Failed to save campaign"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/campaigns/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(`Campaign sent to ${data.recipientCount} recipients (${data.messagesSent} messages)`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setType("sms");
    setSubject("");
    setBody("");
    setScheduledAt("");
    setCriteriaCity("");
    setCriteriaStage("");
    setCriteriaSource("");
    setAudiencePreview(null);
    setDialogOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditing(c);
    setName(c.name);
    setDescription(c.description || "");
    setType(c.type as "sms" | "email" | "both");
    setSubject(c.subject || "");
    setBody(c.body);
    setScheduledAt(c.scheduledAt ? c.scheduledAt.slice(0, 16) : "");
    const criteria = JSON.parse(c.targetCriteria || "{}");
    setCriteriaCity(criteria.city || "");
    setCriteriaStage(criteria.lifecycleStage || "");
    setCriteriaSource(criteria.source || "");
    setAudiencePreview(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  function buildCriteria() {
    const c: Record<string, string> = {};
    if (criteriaCity) c.city = criteriaCity;
    if (criteriaStage) c.lifecycleStage = criteriaStage;
    if (criteriaSource) c.source = criteriaSource;
    return JSON.stringify(c);
  }

  async function previewAudience() {
    try {
      const res = await fetch("/api/campaigns/preview-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: buildCriteria(), type }),
      });
      if (res.ok) {
        setAudiencePreview(await res.json());
      }
    } catch {
      toast.error("Failed to preview audience");
    }
  }

  function handleSave() {
    saveMutation.mutate({
      name,
      description: description || undefined,
      type,
      subject: subject || undefined,
      body,
      targetCriteria: buildCriteria(),
      scheduledAt: scheduledAt || null,
    });
  }

  const filtered = campaigns
    .filter((c) => statusFilter === "all" || c.status === statusFilter)
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || "").toLowerCase().includes(search.toLowerCase())
    );

  const stats = {
    total: campaigns.length,
    draft: campaigns.filter((c) => c.status === "Draft").length,
    sent: campaigns.filter((c) => c.status === "Sent").length,
    totalRecipients: campaigns.reduce((s, c) => s + c.sentCount, 0),
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage SMS & email campaigns
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      {isError && <ErrorState message="Failed to load campaigns." onRetry={refetch} />}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-xs text-slate-500 mt-1">Total Campaigns</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.draft}</div>
            <div className="text-xs text-slate-500 mt-1">Drafts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.sent}</div>
            <div className="text-xs text-slate-500 mt-1">Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{stats.totalRecipients}</div>
            <div className="text-xs text-slate-500 mt-1">Total Messages Sent</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(String(v ?? ""))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Paused">Paused</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600 mb-2">No campaigns yet</h3>
            <p className="text-sm text-slate-400 mb-4">
              Create your first marketing campaign to reach your customers
            </p>
            <Button onClick={openCreate} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" /> Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">{c.name}</h3>
                      <Badge className={statusColors[c.status] || "bg-slate-100"}>
                        {c.status}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        {typeIcons[c.type]}
                        {c.type.toUpperCase()}
                      </Badge>
                    </div>
                    {c.description && (
                      <p className="text-sm text-slate-500 mb-2 line-clamp-1">{c.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {c.audienceCount} recipients
                      </span>
                      {c.sentCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Send className="w-3.5 h-3.5" />
                          {c.sentCount} sent
                        </span>
                      )}
                      {c.scheduledAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Scheduled {formatDate(c.scheduledAt)}
                        </span>
                      )}
                      {c.sentAt && (
                        <span>Sent {formatDate(c.sentAt)}</span>
                      )}
                      <span>Created {formatDate(c.createdAt)}</span>
                    </div>

                    {/* Stats row for sent campaigns */}
                    {c.status === "Sent" && c.sentCount > 0 && (
                      <div className="flex gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs text-slate-600">
                            {c.sentCount} sent
                          </span>
                        </div>
                        {c.openedCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-xs text-slate-600">
                              {c.openedCount} opened ({Math.round((c.openedCount / c.sentCount) * 100)}%)
                            </span>
                          </div>
                        )}
                        {c.clickedCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-xs text-slate-600">
                              {c.clickedCount} clicked
                            </span>
                          </div>
                        )}
                        {c.failedCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-xs text-slate-600">
                              {c.failedCount} failed
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetailCampaign(c)}
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {c.status === "Draft" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(c)}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={
                            <Button variant="ghost" size="sm" className="text-emerald-600" title="Send now">
                              <Send className="w-4 h-4" />
                            </Button>
                          } />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Send Campaign</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will send &quot;{c.name}&quot; to all matching recipients. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => sendMutation.mutate(c.id)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                Send Now
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger render={
                        <Button variant="ghost" size="sm" className="text-red-500" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      } />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{c.name}&quot;? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(c.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Campaign" : "New Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Campaign Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Spring Detailing Special"
                />
              </div>
              <div className="col-span-2">
                <Label>Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                />
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={type} onValueChange={(v) => setType(String(v ?? "") as "sms" | "email" | "both")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="both">SMS + Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schedule (optional)</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>

            {(type === "email" || type === "both") && (
              <div>
                <Label>Email Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your vehicle deserves the best..."
                />
              </div>
            )}

            <div>
              <Label>Message Body</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hi {name}! We'd love to help you keep your vehicle looking fresh..."
                rows={4}
              />
              <p className="text-xs text-slate-400 mt-1">
                Use {"{name}"} for customer name, {"{phone}"} for phone
              </p>
            </div>

            {/* Audience Targeting */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Audience Targeting</Label>
                <Button variant="outline" size="sm" onClick={previewAudience}>
                  <Users className="w-3.5 h-3.5 mr-1" /> Preview Audience
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">City</Label>
                  <Input
                    value={criteriaCity}
                    onChange={(e) => setCriteriaCity(e.target.value)}
                    placeholder="Any"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Lifecycle Stage</Label>
                  <Select value={criteriaStage || "all"} onValueChange={(v) => setCriteriaStage(String(v ?? "") === "all" ? "" : String(v ?? ""))}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="at-risk">At Risk</SelectItem>
                      <SelectItem value="dormant">Dormant</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Source</Label>
                  <Input
                    value={criteriaSource}
                    onChange={(e) => setCriteriaSource(e.target.value)}
                    placeholder="Any"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {audiencePreview && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-slate-900">
                      {audiencePreview.count} matching customers
                    </span>
                  </div>
                  {audiencePreview.sample.length > 0 && (
                    <div className="space-y-1">
                      {audiencePreview.sample.map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-xs text-slate-500">
                          <span>{s.name}</span>
                          <span>{s.phone || s.email || "—"}</span>
                        </div>
                      ))}
                      {audiencePreview.count > 10 && (
                        <p className="text-xs text-slate-400 mt-1">
                          ...and {audiencePreview.count - 10} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name || !body || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Create Campaign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailCampaign} onOpenChange={() => setDetailCampaign(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailCampaign?.name}</DialogTitle>
          </DialogHeader>
          {detailCampaign && (
            <div className="space-y-4 mt-2">
              <div className="flex gap-2">
                <Badge className={statusColors[detailCampaign.status]}>
                  {detailCampaign.status}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  {typeIcons[detailCampaign.type]}
                  {detailCampaign.type.toUpperCase()}
                </Badge>
              </div>

              {detailCampaign.description && (
                <p className="text-sm text-slate-600">{detailCampaign.description}</p>
              )}

              {detailCampaign.subject && (
                <div>
                  <Label className="text-xs text-slate-400">Subject</Label>
                  <p className="text-sm">{detailCampaign.subject}</p>
                </div>
              )}

              <div>
                <Label className="text-xs text-slate-400">Message</Label>
                <div className="bg-slate-50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {detailCampaign.body}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-slate-900">{detailCampaign.audienceCount}</div>
                  <div className="text-xs text-slate-500">Audience</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-emerald-600">{detailCampaign.sentCount}</div>
                  <div className="text-xs text-slate-500">Sent</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-red-600">{detailCampaign.failedCount}</div>
                  <div className="text-xs text-slate-500">Failed</div>
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>Created {formatDate(detailCampaign.createdAt)}</span>
                {detailCampaign.sentAt && <span>Sent {formatDate(detailCampaign.sentAt)}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
