"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UploadStep } from "@/components/settings/import-gv/upload-step";
import { PreviewStep } from "@/components/settings/import-gv/preview-step";
import { ImportingStep } from "@/components/settings/import-gv/importing-step";
import { DoneStep } from "@/components/settings/import-gv/done-step";
import type {
  Step,
  ImportStats,
  ImportResult,
  PreviewRecord,
} from "@/components/settings/import-gv/types";

export default function ImportGoogleVoicePage() {
  const [step, setStep] = useState<Step>("upload");

  const [stats, setStats] = useState<ImportStats | null>(null);
  const [preview, setPreview] = useState<PreviewRecord[]>([]);
  const [allRecords, setAllRecords] = useState<PreviewRecord[]>([]);

  const [matchCustomers, setMatchCustomers] = useState(true);
  const [createNewCustomers, setCreateNewCustomers] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleUploadComplete = useCallback(
    (data: {
      stats: ImportStats;
      preview: PreviewRecord[];
      records: PreviewRecord[];
    }) => {
      setStats(data.stats);
      setPreview(data.preview);
      setAllRecords(data.records);
      setStep("preview");
    },
    []
  );

  const handleStartOver = useCallback(() => {
    setStep("upload");
    setStats(null);
    setPreview([]);
    setAllRecords([]);
    setResult(null);
  }, []);

  const handleImport = useCallback(async () => {
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
  }, [allRecords, matchCustomers, createNewCustomers, skipDuplicates]);

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-4xl mx-auto">
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

      {step === "upload" && (
        <UploadStep onUploadComplete={handleUploadComplete} />
      )}

      {step === "preview" && stats && (
        <PreviewStep
          stats={stats}
          preview={preview}
          matchCustomers={matchCustomers}
          setMatchCustomers={setMatchCustomers}
          createNewCustomers={createNewCustomers}
          setCreateNewCustomers={setCreateNewCustomers}
          skipDuplicates={skipDuplicates}
          setSkipDuplicates={setSkipDuplicates}
          onStartOver={handleStartOver}
          onImport={handleImport}
        />
      )}

      {step === "importing" && (
        <ImportingStep progress={importProgress} />
      )}

      {step === "done" && result && (
        <DoneStep result={result} onImportAnother={handleStartOver} />
      )}
    </div>
  );
}
