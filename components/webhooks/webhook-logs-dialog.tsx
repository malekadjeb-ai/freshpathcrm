"use client";

import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import type { WebhookLog } from "./types";

interface WebhookLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: WebhookLog[];
}

export function WebhookLogsDialog({ open, onOpenChange, logs }: WebhookLogsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery Logs</DialogTitle>
        </DialogHeader>
        {logs.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No deliveries yet</p>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-3 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {log.event}
                    </Badge>
                    {log.statusCode && (
                      <span className={`text-xs font-mono ${log.success ? "text-emerald-600" : "text-red-600"}`}>
                        {log.statusCode}
                      </span>
                    )}
                    {log.duration != null && (
                      <span className="text-xs text-slate-400">{log.duration}ms</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
                </div>
                {log.error && (
                  <p className="text-xs text-red-500 mt-1">{log.error}</p>
                )}
                <details className="mt-1">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                    View payload
                  </summary>
                  <pre className="mt-1 p-2 bg-slate-50 rounded text-[10px] font-mono overflow-x-auto max-h-32">
                    {(() => {
                      try { return JSON.stringify(JSON.parse(log.payload), null, 2); }
                      catch { return log.payload; }
                    })()}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
