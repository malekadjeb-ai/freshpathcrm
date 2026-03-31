import { Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { LeadDetail } from "./lead-types";

interface LeadOverviewTabProps {
  lead: LeadDetail;
}

export function LeadOverviewTab({ lead }: LeadOverviewTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lead.phone && <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{lead.phone}</span></div>}
            {lead.email && <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{lead.email}</span></div>}
            {lead.address && <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-medium">{lead.address}</span></div>}
            {lead.city && <div className="flex justify-between"><span className="text-slate-500">City</span><span className="font-medium">{lead.city}</span></div>}
            <div className="flex justify-between"><span className="text-slate-500">Source</span><span className="font-medium">{lead.source}{lead.sourceDetail ? ` (${lead.sourceDetail})` : ""}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Priority</span><Badge variant="outline" className="text-xs capitalize">{lead.priority}</Badge></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lead.vehicleInfo && (
              <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-medium flex items-center gap-1"><Car className="w-3.5 h-3.5" />{lead.vehicleInfo}</span></div>
            )}
            <div className="flex justify-between"><span className="text-slate-500">Created</span><span className="font-medium">{formatDate(lead.createdAt)}</span></div>
            {lead.contactedAt && <div className="flex justify-between"><span className="text-slate-500">First Contact</span><span className="font-medium">{formatDate(lead.contactedAt)}</span></div>}
            {lead.convertedAt && <div className="flex justify-between"><span className="text-slate-500">Converted</span><span className="font-medium">{formatDate(lead.convertedAt)}</span></div>}
          </CardContent>
        </Card>
      </div>
      {lead.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-slate-600 whitespace-pre-wrap">{lead.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
