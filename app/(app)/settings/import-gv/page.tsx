"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Upload,
  FileArchive,
  Phone,
  MessageSquare,
  Voicemail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Users,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface PreviewRecord {
  phoneNumber: string;
  contactName?: string;
  direction: "inbound" | "outbound" | "missed";
  type: "call" | "text" | "voicemail";
  timestamp: string;
  duration?: number;
  messageBody?: string;
}

interface ImportStats {
  total: number;
  calls: number;
  texts: number;
  voicemails: number;
  uniqueContacts: number;
  dateRange: { start: string; end: string } | null;
}

interface ImportResult {
  imported: number;
  skipped: number;
  matched: number;
  customersCreated: number;
  total: number;
}

type Step = "upload" | "preview" | "importing" | "done";

export default function ImportGoogleVoicePage() {
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview data
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [preview, setPreview] = useState<PreviewRecord[]>([]);
  const [allRecords, setAllRecords] = useState<PreviewRecord[]>([]);

  // Import options
  const [matchCustomers, setMatchCustomers] = useState(true);
  const [createNewCustomers, setCreateNewCustomers] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Import progress
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast.error("Please upload a .zip file from Google Takeout");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/google-voice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to parse ZIP file");
        return;
      }

      const data = await res.json();
      setStats(data.stats);
      setPreview(data.preview);
      setAllRecords(data.records);
      setStep("preview");
      toast.success(`Found ${data.stats.total} records`);
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = async () => {
    setStep("importing");
    setImportProgress(10);

    try {
      const res = await fetch("/api/import/google-voice/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: allRecords,
          matchCustomers,
          createNewCustomers,
          skipDuplicates,
        }),
      });

      setImportProgress(90);

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Import failed");
        setStep("preview");
        return;
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setImportProgress(100);
      setStep("done");
      toast.success(`Imported ${data.imported} records!`);
    } catch {
      toast.error("Import failed");
      setStep("preview");
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Settings
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Import Google Voice History
          </h1>
          <p className="text-sm text-slate-500">
            Upload your Google Takeout Voice export to import call and text
            history
          </p>
        </div>
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardContent className="p-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                dragging
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                  <p className="text-slate-600 font-medium">
                    Parsing ZIP file...
                  </p>
                  <p className="text-sm text-slate-400">
                    This may take a moment for large exports
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-slate-700 font-medium text-lg">
                      Drop your Google Takeout ZIP here
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      or click to browse — accepts .zip files
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-700 mb-2">
                How to export from Google Takeout:
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Go to{" "}
                  <a
                    href="https://takeout.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 underline"
                  >
                    takeout.google.com
                  </a>
                </li>
                <li>Click &quot;Deselect all&quot;</li>
                <li>Scroll down and select only &quot;Voice&quot;</li>
                <li>Click &quot;Next step&quot; → &quot;Create export&quot;</li>
                <li>Download the ZIP when ready and upload it here</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === "preview" && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Phone className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-slate-900">
                  {stats.calls}
                </div>
                <div className="text-xs text-slate-500">Calls</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MessageSquare className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-slate-900">
                  {stats.texts}
                </div>
                <div className="text-xs text-slate-500">Texts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Voicemail className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-slate-900">
                  {stats.voicemails}
                </div>
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

          {/* Import Options */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-slate-900">Import Options</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="match"
                    className="text-sm text-slate-700 cursor-pointer"
                  >
                    Match records to existing customers by phone number
                  </Label>
                  <Switch
                    id="match"
                    checked={matchCustomers}
                    onCheckedChange={setMatchCustomers}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="create"
                    className="text-sm text-slate-700 cursor-pointer"
                  >
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
                  <Label
                    htmlFor="dedup"
                    className="text-sm text-slate-700 cursor-pointer"
                  >
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

          {/* Preview Table */}
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
                            : r.messageBody || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setStep("upload");
                setStats(null);
                setPreview([]);
                setAllRecords([]);
              }}
            >
              Start Over
            </Button>
            <Button
              onClick={handleImport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FileArchive className="w-4 h-4 mr-2" />
              Import {stats.total} Records
            </Button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Importing records...
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Matching customers and creating communications
            </p>
            <Progress value={importProgress} className="max-w-md mx-auto" />
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {step === "done" && result && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-slate-900">
                Import Complete!
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg mx-auto mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {result.imported}
                </div>
                <div className="text-xs text-slate-500">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {result.matched}
                </div>
                <div className="text-xs text-slate-500">Matched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {result.customersCreated}
                </div>
                <div className="text-xs text-slate-500">New Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-400">
                  {result.skipped}
                </div>
                <div className="text-xs text-slate-500">Skipped</div>
              </div>
            </div>

            {result.skipped > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3 mb-6 max-w-lg mx-auto">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {result.skipped} records were skipped (duplicates or
                  unmatched)
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Link href="/communications">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  View Communications
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setStats(null);
                  setPreview([]);
                  setAllRecords([]);
                  setResult(null);
                }}
              >
                Import Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
