"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, Search, Pencil, UserCheck, UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fetchJson, getInitials } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { StaffFormDialog } from "./components/staff-form-dialog";

interface StaffData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  color: string;
  isActive: boolean;
  hireDate: string | null;
  notes: string | null;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  technician: "Technician",
  lead_tech: "Lead Technician",
  manager: "Manager",
  admin: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  technician: "bg-blue-100 text-blue-700",
  lead_tech: "bg-purple-100 text-purple-700",
  manager: "bg-amber-100 text-amber-700",
  admin: "bg-emerald-100 text-emerald-700",
};

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffData | null>(null);

  const { data: staff = [], isLoading, isError, refetch } = useQuery<StaffData[]>({
    queryKey: ["staff", filterActive],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterActive !== "all") params.set("active", filterActive);
      return fetchJson(`/api/staff?${params}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member removed");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const filtered = staff.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff & Technicians</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your team and assign jobs</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {isError && <ErrorState message="Failed to load staff." onRetry={refetch} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold text-slate-900">{staff.length}</div><div className="text-xs text-slate-500">Total Staff</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold text-emerald-600">{staff.filter((s) => s.isActive).length}</div><div className="text-xs text-slate-500">Active</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold text-blue-600">{staff.reduce((sum, s) => sum + s.activeJobs, 0)}</div><div className="text-xs text-slate-500">Jobs In Progress</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold text-purple-600">{staff.reduce((sum, s) => sum + s.completedJobs, 0)}</div><div className="text-xs text-slate-500">Jobs Completed</div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterActive} onValueChange={(v) => setFilterActive(v ?? "all")}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-medium text-slate-600 mb-1">No staff found</h3>
            <p className="text-sm text-slate-400">Add team members to start assigning jobs</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <Card key={member.id} className={!member.isActive ? "opacity-60" : ""}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 shrink-0">
                    <AvatarFallback
                      style={{ backgroundColor: member.color + "20", color: member.color }}
                      className="text-sm font-bold"
                    >
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{member.name}</h3>
                      {!member.isActive && <Badge className="bg-slate-200 text-slate-500 text-xs">Inactive</Badge>}
                    </div>
                    <Badge className={`text-xs mt-0.5 ${ROLE_COLORS[member.role] || "bg-slate-100 text-slate-600"}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </Badge>
                    {member.phone && <p className="text-xs text-slate-500 mt-1">{member.phone}</p>}
                    {member.email && <p className="text-xs text-slate-500 truncate">{member.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900">{member.activeJobs}</div>
                    <div className="text-xs text-slate-400">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-600">{member.completedJobs}</div>
                    <div className="text-xs text-slate-400">Done</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-600">{member.totalJobs}</div>
                    <div className="text-xs text-slate-400">Total</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditStaff(member)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleMutation.mutate({ id: member.id, isActive: !member.isActive })}
                    title={member.isActive ? "Deactivate" : "Activate"}
                  >
                    {member.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => deleteMutation.mutate(member.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StaffFormDialog
        open={createOpen || !!editStaff}
        onClose={() => { setCreateOpen(false); setEditStaff(null); }}
        staff={editStaff}
      />
    </div>
  );
}
