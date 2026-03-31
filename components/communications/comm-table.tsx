"use client";

import Link from "next/link";
import {
  Phone, MessageSquare, Mail, StickyNote, ArrowDownLeft, ArrowUpRight,
  Pencil, Trash2, ChevronDown, ChevronUp, Clock, Voicemail, PhoneMissed,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";
import type { Communication } from "./comm-types";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="w-4 h-4" />,
  sms: <MessageSquare className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  note: <StickyNote className="w-4 h-4" />,
  voicemail: <Voicemail className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-50 text-blue-600",
  sms: "bg-green-50 text-green-600",
  email: "bg-purple-50 text-purple-600",
  note: "bg-amber-50 text-amber-600",
  voicemail: "bg-amber-50 text-amber-700",
};

const TYPE_LABELS: Record<string, string> = {
  call: "Call",
  sms: "SMS",
  email: "Email",
  note: "Note",
  voicemail: "Voicemail",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  missed: "bg-red-100 text-red-700",
  "no-answer": "bg-orange-100 text-orange-700",
  voicemail: "bg-amber-100 text-amber-700",
  sent: "bg-blue-100 text-blue-700",
  received: "bg-indigo-100 text-indigo-700",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  missed: "Missed",
  "no-answer": "No Answer",
  voicemail: "Voicemail",
  sent: "Sent",
  received: "Received",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export { TYPE_ICONS, TYPE_COLORS, TYPE_LABELS, STATUS_COLORS, STATUS_LABELS, formatDuration };

interface CommRowProps {
  comm: Communication;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CommRow({ comm, expanded, onToggle, onEdit, onDelete }: CommRowProps) {
  return (
    <>
      <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3">
          <button onClick={onToggle} className="text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${TYPE_COLORS[comm.type] ?? "bg-slate-100 text-slate-600"}`}>
            {TYPE_ICONS[comm.type]}
            {TYPE_LABELS[comm.type] ?? comm.type}
          </span>
        </td>
        <td className="px-4 py-3">
          <Link href={`/customers/${comm.customer.id}`} className="font-medium text-slate-900 hover:text-emerald-600">
            {comm.customer.name}
          </Link>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
            {comm.direction === "missed" ? (
              <PhoneMissed className="w-3.5 h-3.5 text-red-500" />
            ) : comm.direction === "inbound" ? (
              <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            )}
            {comm.direction === "missed" ? "Missed" : comm.direction === "inbound" ? "Inbound" : "Outbound"}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[comm.status] ?? "bg-slate-100 text-slate-600"}`}>
            {STATUS_LABELS[comm.status] ?? comm.status}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-500 text-xs max-w-48 truncate">
          {comm.summary || "—"}
        </td>
        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
          {timeAgo(comm.createdAt)}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger render={<button className="p-1.5 text-slate-400 hover:text-red-500 rounded" />}>
                <Trash2 className="w-3.5 h-3.5" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete communication?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-red-500 hover:bg-red-600 text-white">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/50">
          <td colSpan={8} className="px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Date & Time</span>
                <span className="text-slate-700 font-medium">{formatDateTime(comm.createdAt)}</span>
              </div>
              {comm.duration != null && (
                <div>
                  <span className="text-slate-400 block">Duration</span>
                  <span className="text-slate-700 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(comm.duration)}
                  </span>
                </div>
              )}
              {comm.job && (
                <div>
                  <span className="text-slate-400 block">Linked Job</span>
                  <Link href={`/jobs/${comm.job.id}`} className="text-emerald-600 hover:underline font-medium">
                    {comm.job.status} — {comm.job.scheduledAt ? formatDate(comm.job.scheduledAt) : "Unscheduled"}
                  </Link>
                </div>
              )}
              {comm.outcome && (
                <div>
                  <span className="text-slate-400 block">Outcome</span>
                  <span className="text-slate-700 font-medium capitalize">{comm.outcome.replace("_", " ")}</span>
                </div>
              )}
              {comm.source && comm.source !== "manual" && (
                <div>
                  <span className="text-slate-400 block">Source</span>
                  <span className="text-slate-700 font-medium capitalize">{comm.source.replace(/_/g, " ")}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block">Contact</span>
                <span className="text-slate-700">{comm.customer.phone || comm.customer.email || "—"}</span>
              </div>
            </div>
            {comm.summary && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-400 block mb-1">Summary</span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{comm.summary}</p>
              </div>
            )}
            {comm.body && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-400 block mb-1">Message</span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{comm.body}</p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

interface CommMobileCardProps {
  comm: Communication;
}

export function CommMobileCard({ comm }: CommMobileCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center ${TYPE_COLORS[comm.type] ?? "bg-slate-100 text-slate-500"}`}>
            {TYPE_ICONS[comm.type]}
          </span>
          <div>
            <Link href={`/customers/${comm.customerId}`} className="font-medium text-sm text-slate-900 hover:text-emerald-600">
              {comm.customer.name}
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>{TYPE_LABELS[comm.type] ?? comm.type}</span>
              <span>·</span>
              <span>{comm.direction === "inbound" ? "Inbound" : comm.direction === "missed" ? "Missed" : "Outbound"}</span>
            </div>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[comm.status] ?? "bg-slate-100 text-slate-600"}`}>
          {STATUS_LABELS[comm.status] ?? comm.status}
        </span>
      </div>
      {comm.summary && (
        <p className="text-xs text-slate-600 line-clamp-2 mb-2">{comm.summary}</p>
      )}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{timeAgo(comm.createdAt)}</span>
        {comm.duration != null && <span>{formatDuration(comm.duration)}</span>}
      </div>
    </div>
  );
}
