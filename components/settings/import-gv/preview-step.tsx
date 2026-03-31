"use client";

import {
  Phone,
  MessageSquare,
  Voicemail,
  Users,
  Clock,
  FileArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { ImportStats, PreviewRecord } from "./types";
import { formatDate, formatDuration } from "./utils";

interface PreviewStepProps {
  stats: ImportStats;
  preview: PreviewRecord[];
  matchCustomers: boolean;
  setMatchCustomers: (v: boolean) => void;
  createNewCustomers: boolean;
  setCreateNewCustomers: (v: boolean) => void;
  skipDuplicates: boolean;
  setSkipDuplicates: (v: boolean) => void;
  onStartOver: () => void;
  onImport: () => void;
}

export function PreviewStep({
  stats,
  preview,
  matchCustomers,
  setMatchCustomers,
  createNewCustomers,
  setCreateNewCustomers,
  skipDuplicates,
  setSkipDuplicates,
  onStartOver,
  onImport,
}: PreviewStepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Phone className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900">{stats.calls}</div>
            <div className="text-xs text-slate-500">Calls</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900">{stats.texts}</div>
            <div className="text-xs text-slate-500">Texts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Voicemail className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900">{stats.voicemails}</div>
            <div className="text-xs text-slate-500">Voicemails</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900">
              {stats.uniqueContacts}
            </div>
            <div className="text-xs text-slate-500">Contacts</div>
          </CardContent>
        </Card>
      </div>

      {stats.dateRange && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          <span>
            {formatDate(stats.dateRange.start)} —{" "}
            {formatDate(stats.dateRange.end)}
          </span>
        </div>
      )}

      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-slate-900">Import Options</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="match" className="text-sm text-slate-700 cursor-pointer">
                Match records to existing customers by phone number
              </Label>
              <Switch
                id="match"
                checked={matchCustomers}
                onCheckedChange={setMatchCustomers}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="create" className="text-sm text-slate-700 cursor-pointer">
                Create new customers for unmatched phone numbers
              </Label>
              <Switch
                id="create"
                checked={createNewCustomers}
                onCheckedChange={setCreateNewCustomers}
                disabled={!matchCustomers}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="dedup" className="text-sm text-slate-700 cursor-pointer">
                Skip duplicate records (already imported)
              </Label>
              <Switch
                id="dedup"
                checked={skipDuplicates}
                onCheckedChange={setSkipDuplicates}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-slate-900 mb-3">
            Preview ({preview.length} of {stats.total} records)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Contact</th>
                  <th className="pb-2 pr-4">Direction</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.map((r, i) => (
                  <tr key={i} className="text-slate-700">
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          r.type === "call"
                            ? "bg-blue-50 text-blue-700"
                            : r.type === "text"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {r.type === "call" ? (
                          <Phone className="w-3 h-3" />
                        ) : r.type === "text" ? (
                          <MessageSquare className="w-3 h-3" />
                        ) : (
                          <Voicemail className="w-3 h-3" />
                        )}
                        {r.type}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-medium">
                      {r.contactName || r.phoneNumber || "Unknown"}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`text-xs ${
                          r.direction === "missed"
                            ? "text-red-600"
                            : r.direction === "outbound"
                              ? "text-blue-600"
                              : "text-slate-500"
                        }`}
                      >
                        {r.direction}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(r.timestamp)}
                    </td>
                    <td className="py-2 text-xs text-slate-500 max-w-[200px] truncate">
                      {r.duration
                        ? formatDuration(r.duration)
                        : r.messageBody || "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onStartOver}>
          Start Over
        </Button>
        <Button
          onClick={onImport}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <FileArchive className="w-4 h-4 mr-2" />
          Import {stats.total} Records
        </Button>
      </div>
    </div>
  );
}
