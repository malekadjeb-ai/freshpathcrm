"use client";

import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ImportResult } from "./types";

interface DoneStepProps {
  result: ImportResult;
  onImportAnother: () => void;
}

export function DoneStep({ result, onImportAnother }: DoneStepProps) {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">Import Complete!</h3>
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
              {result.skipped} records were skipped (duplicates or unmatched)
            </span>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Link href="/communications">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              View Communications
            </Button>
          </Link>
          <Button variant="outline" onClick={onImportAnother}>
            Import Another File
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
