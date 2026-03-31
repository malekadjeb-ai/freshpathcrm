"use client";

import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ImportingStepProps {
  progress: number;
}

export function ImportingStep({ progress }: ImportingStepProps) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Importing records...
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Matching customers and creating communications
        </p>
        <Progress value={progress} className="max-w-md mx-auto" />
      </CardContent>
    </Card>
  );
}
