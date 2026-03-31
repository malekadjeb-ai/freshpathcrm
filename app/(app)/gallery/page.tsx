"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image as ImageIcon, Car, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { formatDate, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";

interface GalleryPhoto {
  url: string;
  type: "before" | "after";
}

interface GalleryItem {
  id: string;
  vehicle: string | null;
  vehicleType: string | null;
  vehicleColor: string | null;
  services: string[];
  completedAt: string | null;
  before: GalleryPhoto[];
  after: GalleryPhoto[];
}

export default function GalleryPage() {
  const [filter, setFilter] = useState<"all" | "before-after">("all");
  const [lightbox, setLightbox] = useState<{ url: string; type: string } | null>(null);

  const { data: items = [], isLoading, isError, refetch } = useQuery<GalleryItem[]>({
    queryKey: ["gallery"],
    queryFn: () => fetchJson("/api/gallery"),
  });

  const filtered = filter === "before-after"
    ? items.filter((i) => i.before.length > 0 && i.after.length > 0)
    : items;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Before & After Gallery</h1>
          <p className="text-sm text-slate-500 mt-1">
            Showcase your best work — {items.length} jobs featured
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({items.length})
          </Button>
          <Button
            variant={filter === "before-after" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("before-after")}
          >
            Before & After ({items.filter((i) => i.before.length > 0 && i.after.length > 0).length})
          </Button>
        </div>
      </div>

      {isError && <ErrorState message="Failed to load gallery." onRetry={refetch} />}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No gallery items yet"
          description="Toggle 'Show in Gallery' on completed jobs with photos to feature them here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Before/After comparison */}
                {item.before.length > 0 && item.after.length > 0 ? (
                  <div className="grid grid-cols-2 gap-0.5 bg-slate-200">
                    <div className="relative">
                      <button
                        onClick={() => setLightbox({ url: item.before[0].url, type: "Before" })}
                        className="w-full"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.before[0].url}
                          alt="Before"
                          className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                        />
                      </button>
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                        Before
                      </span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setLightbox({ url: item.after[0].url, type: "After" })}
                        className="w-full"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.after[0].url}
                          alt="After"
                          className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                        />
                      </button>
                      <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                        After
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-0.5 bg-slate-200">
                    {[...item.before, ...item.after].slice(0, 3).map((photo, i) => (
                      <button
                        key={i}
                        onClick={() => setLightbox({ url: photo.url, type: photo.type })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`${photo.type} ${i + 1}`}
                          className="w-full h-36 object-cover hover:opacity-90 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Info */}
                <div className="p-4">
                  {item.vehicle && (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900 mb-1">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      {item.vehicle}
                      {item.vehicleColor && (
                        <span className="text-slate-400">— {item.vehicleColor}</span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {item.services.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    {item.completedAt && <span>Completed {formatDate(item.completedAt)}</span>}
                    <span>
                      {item.before.length} before · {item.after.length} after
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="sm:max-w-3xl p-2">
          {lightbox && (
            <div>
              <span className="absolute top-4 left-4 bg-black/60 text-white text-xs font-bold uppercase tracking-wider px-2 py-1 rounded z-10">
                {lightbox.type}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.url}
                alt={lightbox.type}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
