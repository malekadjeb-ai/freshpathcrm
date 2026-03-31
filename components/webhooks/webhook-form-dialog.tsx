"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { WEBHOOK_EVENTS } from "@/lib/validations/webhook";
import { EVENT_CATEGORIES } from "./types";
import type { WebhookEndpoint } from "./types";

interface WebhookFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: WebhookEndpoint | null;
  onSave: (payload: Record<string, unknown>) => void;
  isSaving: boolean;
}

export function WebhookFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  isSaving,
}: WebhookFormDialogProps) {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [initialized, setInitialized] = useState<string | null>(null);

  const dialogKey = editing?.id ?? "create";
  if (initialized !== dialogKey && open) {
    setUrl(editing?.url ?? "");
    setDescription(editing?.description ?? "");
    setSecret(editing?.secret ?? "");
    setSelectedEvents(editing?.events ?? []);
    setIsActive(editing?.isActive ?? true);
    setInitialized(dialogKey);
  }

  if (!open && initialized !== null) {
    setInitialized(null);
  }

  const toggleEvent = useCallback((event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }, []);

  const toggleCategory = useCallback((events: string[]) => {
    setSelectedEvents((prev) => {
      const allSelected = events.every((e) => prev.includes(e));
      if (allSelected) {
        return prev.filter((e) => !events.includes(e));
      }
      const newSet = new Set([...prev, ...events]);
      return Array.from(newSet);
    });
  }, []);

  function handleSave() {
    onSave({
      url,
      description: description || undefined,
      secret: secret || undefined,
      events: selectedEvents,
      isActive,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Webhook" : "Add Webhook Endpoint"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Endpoint URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Zapier integration, Slack notifications..."
            />
          </div>
          <div>
            <Label>Signing Secret (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="whsec_..."
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const s = "whsec_" + crypto.randomUUID().replace(/-/g, "");
                  setSecret(s);
                }}
              >
                Generate
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Used to sign payloads with HMAC-SHA256 for verification
            </p>
          </div>

          <div>
            <Label className="mb-2 block">Events</Label>
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {Object.entries(EVENT_CATEGORIES).map(([category, events]) => {
                const allSelected = events.every((e) => selectedEvents.includes(e));
                const someSelected = events.some((e) => selectedEvents.includes(e));
                return (
                  <div key={category} className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onCheckedChange={() => toggleCategory(events)}
                      />
                      <span className="text-sm font-medium text-slate-700">{category}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pl-6">
                      {events.map((event) => (
                        <label key={event} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedEvents.includes(event)}
                            onCheckedChange={() => toggleEvent(event)}
                          />
                          <span className="text-xs font-mono text-slate-600">{event}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedEvents.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                {selectedEvents.length} of {WEBHOOK_EVENTS.length} events selected
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!url || selectedEvents.length === 0 || isSaving}
          >
            {isSaving ? "Saving..." : editing ? "Update" : "Create Endpoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
