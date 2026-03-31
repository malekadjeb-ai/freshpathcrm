"use client";

import { MessageSquare, Mail, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { type Campaign, statusColors } from "./campaign-types";

const typeIcons: Record<string, React.ReactNode> = {
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  both: <Send className="w-3.5 h-3.5" />,
};

interface CampaignDetailDialogProps {
  campaign: Campaign | null;
  onClose: () => void;
}

export function CampaignDetailDialog({ campaign, onClose }: CampaignDetailDialogProps) {
  return (
    <Dialog open={!!campaign} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{campaign?.name}</DialogTitle>
        </DialogHeader>
        {campaign && (
          <div className="space-y-4 mt-2">
            <div className="flex gap-2">
              <Badge className={statusColors[campaign.status]}>{campaign.status}</Badge>
              <Badge variant="outline" className="gap-1">
                {typeIcons[campaign.type]}
                {campaign.type.toUpperCase()}
              </Badge>
            </div>
            {campaign.description && <p className="text-sm text-slate-600">{campaign.description}</p>}
            {campaign.subject && (
              <div>
                <Label className="text-xs text-slate-400">Subject</Label>
                <p className="text-sm">{campaign.subject}</p>
              </div>
            )}
            <div>
              <Label className="text-xs text-slate-400">Message</Label>
              <div className="bg-slate-50 rounded-lg p-3 text-sm whitespace-pre-wrap">{campaign.body}</div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-lg font-bold text-slate-900">{campaign.audienceCount}</div>
                <div className="text-xs text-slate-500">Audience</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-lg font-bold text-emerald-600">{campaign.sentCount}</div>
                <div className="text-xs text-slate-500">Sent</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-lg font-bold text-red-600">{campaign.failedCount}</div>
                <div className="text-xs text-slate-500">Failed</div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Created {formatDate(campaign.createdAt)}</span>
              {campaign.sentAt && <span>Sent {formatDate(campaign.sentAt)}</span>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
