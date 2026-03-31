"use client";

import { Send, Users, Calendar, Trash2, Edit2, Eye, MessageSquare, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatDate } from "@/lib/utils";
import { type Campaign, statusColors } from "./campaign-types";

const typeIcons: Record<string, React.ReactNode> = {
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  both: <Send className="w-3.5 h-3.5" />,
};

interface CampaignCardProps {
  campaign: Campaign;
  onView: () => void;
  onEdit: () => void;
  onSend: () => void;
  onDelete: () => void;
}

export function CampaignCard({ campaign: c, onView, onEdit, onSend, onDelete }: CampaignCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
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

            {c.status === "Sent" && c.sentCount > 0 && (
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-600">{c.sentCount} sent</span>
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
                    <span className="text-xs text-slate-600">{c.clickedCount} clicked</span>
                  </div>
                )}
                {c.failedCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs text-slate-600">{c.failedCount} failed</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onView} title="View details">
              <Eye className="w-4 h-4" />
            </Button>
            {c.status === "Draft" && (
              <>
                <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
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
                        onClick={onSend}
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
                    onClick={onDelete}
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
  );
}
