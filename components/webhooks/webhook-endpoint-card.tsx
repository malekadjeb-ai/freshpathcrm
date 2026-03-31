"use client";

import {
  Zap,
  Trash2,
  Edit2,
  Eye,
  TestTube,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { formatDateTime } from "@/lib/utils";
import type { WebhookEndpoint } from "./types";

interface WebhookEndpointCardProps {
  endpoint: WebhookEndpoint;
  onToggle: (id: string, isActive: boolean) => void;
  onTest: (id: string) => void;
  onViewLogs: (id: string) => void;
  onEdit: (endpoint: WebhookEndpoint) => void;
  onDelete: (id: string) => void;
}

export function WebhookEndpointCard({
  endpoint: ep,
  onToggle,
  onTest,
  onViewLogs,
  onEdit,
  onDelete,
}: WebhookEndpointCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Zap className={`w-4 h-4 ${ep.isActive ? "text-emerald-500" : "text-slate-300"}`} />
              <code className="text-sm font-mono text-slate-900 truncate block max-w-md">
                {ep.url}
              </code>
              <Badge className={ep.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                {ep.isActive ? "Active" : "Inactive"}
              </Badge>
              {ep.failCount > 0 && (
                <Badge className="bg-red-100 text-red-700">
                  {ep.failCount} failures
                </Badge>
              )}
            </div>
            {ep.description && (
              <p className="text-sm text-slate-500 mb-2">{ep.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ep.events.slice(0, 5).map((event) => (
                <Badge key={event} variant="secondary" className="text-[10px] font-mono">
                  {event}
                </Badge>
              ))}
              {ep.events.length > 5 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{ep.events.length - 5} more
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>{ep.logCount} deliveries</span>
              {ep.lastFired && <span>Last fired {formatDateTime(ep.lastFired)}</span>}
              {ep.secret && <span>Signed</span>}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Switch
              checked={ep.isActive}
              onCheckedChange={(checked) => onToggle(ep.id, !!checked)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTest(ep.id)}
              title="Send test"
            >
              <TestTube className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewLogs(ep.id)}
              title="View logs"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(ep)} title="Edit">
              <Edit2 className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="ghost" size="sm" className="text-red-500" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                  <AlertDialogDescription>
                    Delete this endpoint and all delivery logs? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(ep.id)}
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
