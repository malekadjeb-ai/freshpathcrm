"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ClipboardCheck, Plus, Search, Trash2, Pencil, X, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface ChecklistItem {
  label: string;
  required: boolean;
}

interface ChecklistData {
  id: string;
  name: string;
  serviceItemId: string | null;
  items: ChecklistItem[];
  isActive: boolean;
  createdAt: string;
}

interface ServiceItem {
  id: string;
  name: string;
}

export default function ChecklistsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [serviceItemId, setServiceItemId] = useState<string>("");
  const [items, setItems] = useState<ChecklistItem[]>([{ label: "", required: false }]);
  const [isActive, setIsActive] = useState(true);

  const { data: checklists = [], isLoading, isError, refetch } = useQuery<ChecklistData[]>({
    queryKey: ["checklists"],
    queryFn: () => fetchJson("/api/checklists"),
  });

  const { data: services = [] } = useQuery<ServiceItem[]>({
    queryKey: ["services-list"],
    queryFn: () => fetchJson("/api/services?active=true"),
  });

  const resetForm = () => {
    setName("");
    setServiceItemId("");
    setItems([{ label: "", required: false }]);
    setIsActive(true);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (cl: ChecklistData) => {
    setEditingId(cl.id);
    setName(cl.name);
    setServiceItemId(cl.serviceItemId || "");
    setItems(cl.items.length > 0 ? cl.items : [{ label: "", required: false }]);
    setIsActive(cl.isActive);
    setDialogOpen(true);
  };

  const addItem = () => {
    setItems([...items, { label: "", required: false }]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ChecklistItem, value: string | boolean) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validItems = items.filter((i) => i.label.trim());
      if (validItems.length === 0) throw new Error("At least one item is required");

      const payload = {
        name,
        serviceItemId: serviceItemId || null,
        items: validItems,
        isActive,
      };
      const url = editingId ? `/api/checklists/${editingId}` : "/api/checklists";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      toast.success(editingId ? "Checklist updated" : "Checklist created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/checklists/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      toast.success("Checklist deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const filtered = checklists.filter((c) => {
    if (!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Checklists</h1>
          <p className="text-sm text-slate-500 mt-1">Quality control templates for job completion</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Checklist
        </Button>
      </div>

      {isError && <ErrorState message="Failed to load checklists." onRetry={refetch} />}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-slate-900">{checklists.length}</div>
            <div className="text-xs text-slate-500">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-emerald-600">{checklists.filter((c) => c.isActive).length}</div>
            <div className="text-xs text-slate-500">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-slate-900">
              {checklists.reduce((s, c) => s + c.items.length, 0)}
            </div>
            <div className="text-xs text-slate-500">Total Items</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search checklists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-medium text-slate-600 mb-1">No checklists</h3>
            <p className="text-sm text-slate-400">Create quality control checklists for your technicians</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((cl) => (
            <Card key={cl.id}>
              <CardContent className="py-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{cl.name}</span>
                      <Badge className={cl.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                        {cl.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-slate-400">
                      <span>{cl.items.length} items</span>
                      <span>{cl.items.filter((i) => i.required).length} required</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cl.items.slice(0, 5).map((item, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {item.label}
                        </span>
                      ))}
                      {cl.items.length > 5 && (
                        <span className="text-xs text-slate-400">+{cl.items.length - 5} more</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(cl)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={
                        <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      } />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete checklist?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete &quot;{cl.name}&quot;. Existing job checklists will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-500 hover:bg-red-600"
                            onClick={() => deleteMutation.mutate(cl.id)}
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
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Checklist" : "Create Checklist"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Interior Detail Checklist"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Linked Service (optional)</Label>
              <Select value={serviceItemId || "none"} onValueChange={(v) => setServiceItemId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No linked service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                    <Input
                      value={item.label}
                      onChange={(e) => updateItem(idx, "label", e.target.value)}
                      placeholder={`Step ${idx + 1}...`}
                      className="flex-1 text-sm"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Checkbox
                        checked={item.required}
                        onCheckedChange={(v) => updateItem(idx, "required", !!v)}
                      />
                      <span className="text-xs text-slate-500">Req</span>
                    </div>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label className="text-sm">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !name || items.every((i) => !i.label.trim())}
            >
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
