"use client";

import { useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PreviewRecord, ImportStats } from "./types";

interface UploadStepProps {
  onUploadComplete: (data: {
    stats: ImportStats;
    preview: PreviewRecord[];
    records: PreviewRecord[];
  }) => void;
}

export function UploadStep({ onUploadComplete }: UploadStepProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
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
        onUploadComplete({
          stats: data.stats,
          preview: data.preview,
          records: data.records,
        });
        toast.success(`Found ${data.stats.total} records`);
      } catch {
        toast.error("Failed to upload file");
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
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
              <p className="text-slate-600 font-medium">Parsing ZIP file...</p>
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
  );
}
