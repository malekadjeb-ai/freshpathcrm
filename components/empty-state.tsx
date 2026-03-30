"use client";

import { Inbox, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode | LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
}: EmptyStateProps) {
  const resolvedActionLabel = actionLabel || action?.label;
  const resolvedOnAction = onAction || action?.onClick;

  const renderIcon = () => {
    if (!icon) return <Inbox className="w-10 h-10 text-slate-300 mb-3" />;
    if (typeof icon === "function") {
      const IconComponent = icon as LucideIcon;
      return <IconComponent className="w-10 h-10 text-slate-300 mb-3" />;
    }
    return icon;
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {renderIcon()}
      <p className="text-sm font-medium text-slate-600 text-center">{title}</p>
      {description && (
        <p className="text-xs text-slate-400 text-center mt-1">{description}</p>
      )}
      {resolvedActionLabel && resolvedOnAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={resolvedOnAction}
          className="mt-4"
        >
          {resolvedActionLabel}
        </Button>
      )}
    </div>
  );
}
