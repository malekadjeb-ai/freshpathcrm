"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AIActionButtonProps {
  type: "next_action" | "draft_message" | "upsell" | "daily_briefing" | "revenue_opportunities" | "job_addons" | "price_check";
  label: string;
  customerId?: string;
  jobId?: string;
  extra?: Record<string, unknown>;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export function AIActionButton({
  type,
  label,
  customerId,
  jobId,
  extra,
  variant = "outline",
  size = "sm",
  className,
}: AIActionButtonProps) {
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, customerId, jobId, extra }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get AI suggestion");
      }
      return res.json();
    },
    onSuccess: () => setOpen(true),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className={cn(
          "gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300",
          className
        )}
      >
        {mutation.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              AI Suggestion
            </DialogTitle>
          </DialogHeader>
          {mutation.data?.suggestion && (
            <div className="prose prose-sm prose-slate max-w-none [&_p]:my-1.5 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold">
              <AIMarkdown content={mutation.data.suggestion} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AIMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-4">
          {listItems.map((item, i) => (
            <li key={i}><InlineFormat text={item} /></li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^#{1,3}\s/)) {
      flushList();
      const text = line.replace(/^#{1,3}\s/, "");
      elements.push(<h3 key={i} className="font-semibold text-sm mt-3 mb-1"><InlineFormat text={text} /></h3>);
    } else if (line.match(/^[-*]\s/)) {
      listItems.push(line.replace(/^[-*]\s/, ""));
    } else if (line.match(/^\d+\.\s/)) {
      listItems.push(line.replace(/^\d+\.\s/, ""));
    } else {
      flushList();
      if (line.trim()) {
        elements.push(<p key={i}><InlineFormat text={line} /></p>);
      }
    }
  }
  flushList();
  return <>{elements}</>;
}

function InlineFormat({ text }: { text: string }) {
  // Split the text on inline markdown tokens and render as React elements,
  // avoiding dangerouslySetInnerHTML entirely.
  const parts: React.ReactNode[] = [];
  // Regex captures: **bold**, *italic*, `code`, $number
  const pattern = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\$\d[\d,.]*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={key++} className="bg-slate-100 px-1 rounded text-xs">{token.slice(1, -1)}</code>);
    } else if (token.startsWith("$")) {
      parts.push(<span key={key++} className="font-mono font-semibold">{token}</span>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
