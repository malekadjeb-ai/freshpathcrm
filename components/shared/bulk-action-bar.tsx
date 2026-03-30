"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface BulkAction {
  value: string;
  label: string;
  destructive?: boolean;
  requiresInput?: "tag" | "status" | "priority";
  options?: { value: string; label: string }[];
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onExecute: (action: string, inputValue?: string) => void;
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  actions,
  onExecute,
  onClear,
}: BulkActionBarProps) {
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");

  if (selectedCount === 0) return null;

  const currentAction = actions.find((a) => a.value === selectedAction);
  const needsInput = currentAction?.requiresInput;
  const hasOptions = currentAction?.options && currentAction.options.length > 0;
  const isDestructive = currentAction?.destructive;

  const canExecute =
    selectedAction &&
    (!needsInput || inputValue.trim().length > 0);

  function handleExecute() {
    if (!canExecute) return;
    onExecute(selectedAction, inputValue || undefined);
    setSelectedAction("");
    setInputValue("");
  }

  function handleActionChange(value: string | null) {
    setSelectedAction(value ?? "");
    setInputValue("");
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 animate-in slide-in-from-top-2 duration-200">
      <span className="text-sm font-medium text-emerald-800 whitespace-nowrap">
        {selectedCount} selected
      </span>

      <div className="h-4 w-px bg-emerald-300" />

      <Select value={selectedAction} onValueChange={handleActionChange}>
        <SelectTrigger className="w-[180px] h-8 text-sm bg-white border-emerald-300">
          <SelectValue placeholder="Choose action..." />
        </SelectTrigger>
        <SelectContent>
          {actions.map((action) => (
            <SelectItem
              key={action.value}
              value={action.value}
              className={action.destructive ? "text-red-600" : ""}
            >
              {action.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {needsInput && hasOptions && (
        <Select value={inputValue} onValueChange={(v: string | null) => setInputValue(v ?? "")}>
          <SelectTrigger className="w-[160px] h-8 text-sm bg-white border-emerald-300">
            <SelectValue placeholder={`Select ${needsInput}...`} />
          </SelectTrigger>
          <SelectContent>
            {currentAction.options!.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {needsInput && !hasOptions && (
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Enter ${needsInput} name...`}
          className="w-[160px] h-8 text-sm bg-white border-emerald-300"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleExecute();
          }}
        />
      )}

      <Button
        size="sm"
        onClick={handleExecute}
        disabled={!canExecute}
        className={
          isDestructive
            ? "bg-red-600 hover:bg-red-700 text-white h-8"
            : "bg-emerald-600 hover:bg-emerald-700 text-white h-8"
        }
      >
        Apply
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setSelectedAction("");
          setInputValue("");
          onClear();
        }}
        className="h-8 w-8 p-0 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
