"use client";

import { Webhook, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WebhookEndpointCard } from "./webhook-endpoint-card";
import type { WebhookEndpoint } from "./types";

interface WebhookEndpointListProps {
  endpoints: WebhookEndpoint[];
  isLoading: boolean;
  onOpenCreate: () => void;
  onToggle: (id: string, isActive: boolean) => void;
  onTest: (id: string) => void;
  onViewLogs: (id: string) => void;
  onEdit: (endpoint: WebhookEndpoint) => void;
  onDelete: (id: string) => void;
}

export function WebhookEndpointList({
  endpoints,
  isLoading,
  onOpenCreate,
  onToggle,
  onTest,
  onViewLogs,
  onEdit,
  onDelete,
}: WebhookEndpointListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (endpoints.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Webhook className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-medium text-slate-600 mb-2">No webhook endpoints</h3>
          <p className="text-sm text-slate-400 mb-4">
            Add an endpoint to receive real-time event notifications
          </p>
          <Button onClick={onOpenCreate} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Add Endpoint
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {endpoints.map((ep) => (
        <WebhookEndpointCard
          key={ep.id}
          endpoint={ep}
          onToggle={onToggle}
          onTest={onTest}
          onViewLogs={onViewLogs}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
