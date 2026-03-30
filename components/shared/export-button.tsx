"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadCSV, formatExportFilename } from "@/lib/export-csv";

interface ExportButtonWithDataProps {
  data: Record<string, unknown>[];
  entity: string;
  columns?: { key: string; label: string }[];
  type?: never;
}

interface ExportButtonLegacyProps {
  type: "customers" | "jobs" | "invoices" | "leads" | "quotes";
  data?: never;
  entity?: never;
  columns?: never;
}

type ExportButtonProps = ExportButtonWithDataProps | ExportButtonLegacyProps;

export function ExportButton(props: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleLegacyExport(type: string) {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?type=${type}&format=csv`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${type} exported as CSV`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  function handleClientExport(
    data: Record<string, unknown>[],
    entity: string,
    columns?: { key: string; label: string }[]
  ) {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    setExporting(true);

    try {
      const exportData = columns
        ? data.map((row) => {
            const mapped: Record<string, unknown> = {};
            for (const col of columns) {
              mapped[col.label] = row[col.key];
            }
            return mapped;
          })
        : data;

      downloadCSV(exportData, formatExportFilename(entity));
      toast.success(`Export complete \u2014 ${data.length} ${entity}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  function handleClick() {
    if ("type" in props && props.type) {
      handleLegacyExport(props.type);
    } else if ("data" in props && props.data) {
      handleClientExport(props.data, props.entity, props.columns);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={exporting}
      onClick={handleClick}
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      {exporting ? "Exporting..." : "Export"}
    </Button>
  );
}
