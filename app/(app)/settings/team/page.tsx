"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson, formatDate, getInitials } from "@/lib/utils";
import { hasPermission, ROLE_HIERARCHY, type Role } from "@/lib/permissions";
import { PermissionGate } from "@/components/permission-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Shield,
  Trash2,
  Copy,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Users,
  Loader2,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-emerald-100 text-emerald-800",
  ADMIN: "bg-blue-100 text-blue-800",
  TECH: "bg-amber-100 text-amber-800",
  VIEWER: "bg-slate-100 text-slate-700",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  TECH: "Tech",
  VIEWER: "Viewer",
};

const INVITABLE_ROLES: Role[] = ["ADMIN", "TECH", "VIEWER"];

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] || ROLE_COLORS.VIEWER}`}
    >
      <Shield className="w-3 h-3" />
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export default function TeamPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const myRole = ((session?.user as Record<string, unknown>)?.role as string) || "VIEWER";
  const myLevel = ROLE_HIERARCHY[myRole as Role] ?? 0;
  const canWrite = hasPermission(myRole as Role, "users:write");
  const canDelete = hasPermission(myRole as Role, "users:delete");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("TECH");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const { data: team = [], isLoading: teamLoading } = useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: () => fetchJson("/api/team"),
  });

  const { data: pendingInvites = [], isLoading: invitesLoading } = useQuery<Invitation[]>({
    queryKey: ["team-invitations"],
    queryFn: () => fetchJson("/api/team/invite"),
    enabled: canWrite,
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      fetchJson<{ success: boolean; inviteUrl: string }>("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("TECH");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      fetchJson(`/api/team/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      setEditingUser(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      fetchJson(`/api/team/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      fetchJson(`/api/team/invite?id=${invitationId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
    },
  });

  function copyInviteLink(token: string, id: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const availableRoles = INVITABLE_ROLES.filter(
    (r) => ROLE_HIERARCHY[r] < myLevel
  );

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Team</h1>
            <p className="text-sm text-slate-500">
              Manage team members and invitations
            </p>
          </div>
        </div>
        <PermissionGate permission="users:write">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger
              render={
                <Button size="lg">
                  <UserPlus className="w-4 h-4" data-icon="inline-start" />
                  Invite Member
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="tech@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {inviteMutation.isError && (
                  <p className="text-sm text-red-600">
                    {(inviteMutation.error as Error).message}
                  </p>
                )}
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={inviteMutation.isPending || !inviteEmail}
                  >
                    {inviteMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" data-icon="inline-start" />
                    )}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </PermissionGate>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Members ({team.length})
          </h2>
        </div>
        {teamLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : team.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No team members yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {team.map((member) => {
              const memberLevel = ROLE_HIERARCHY[member.role as Role] ?? 0;
              const canModify =
                canWrite &&
                member.id !== session?.user?.id &&
                member.role !== "OWNER" &&
                memberLevel < myLevel;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
                    {getInitials(member.name || member.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {member.name || "Unnamed"}
                      </span>
                      {member.id === session?.user?.id && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{member.email}</p>
                  </div>
                  <div className="hidden sm:block text-xs text-slate-400">
                    Joined {formatDate(member.createdAt)}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingUser === member.id && canModify ? (
                      <Select
                        value={member.role}
                        onValueChange={(val) => {
                          updateRoleMutation.mutate({
                            userId: member.id,
                            role: val,
                          });
                        }}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <button
                        onClick={() => canModify && setEditingUser(member.id)}
                        className={canModify ? "cursor-pointer" : "cursor-default"}
                        disabled={!canModify}
                      >
                        <RoleBadge role={member.role} />
                      </button>
                    )}
                    {canModify && canDelete && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          if (confirm(`Remove ${member.name || member.email} from the team?`)) {
                            removeMutation.mutate(member.id);
                          }
                        }}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      <PermissionGate permission="users:write">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Invitations ({pendingInvites.length})
            </h2>
          </div>
          {invitesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : pendingInvites.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No pending invitations
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingInvites.map((invite) => {
                const isExpired = new Date(invite.expiresAt) < new Date();
                return (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm text-slate-400 shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{invite.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <RoleBadge role={invite.role} />
                        {isExpired ? (
                          <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                            <XCircle className="w-3 h-3" /> Expired
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Expires {formatDate(invite.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!isExpired && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => copyInviteLink(invite.token, invite.id)}
                        >
                          {copiedId === invite.id ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" data-icon="inline-start" />
                          ) : (
                            <Copy className="w-3 h-3" data-icon="inline-start" />
                          )}
                          {copiedId === invite.id ? "Copied" : "Copy Link"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => revokeMutation.mutate(invite.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}
