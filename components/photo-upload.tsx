"use client";

import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Photo {
  url: string;
  type: "before" | "after";
  uploadedAt: string;
}

interface PhotoUploadProps {
  jobId: string;
  photos: Photo[];
}

export function PhotoUpload({ jobId, photos }: PhotoUploadProps) {
  const [activeTab, setActiveTab] = useState<"before" | "after">("before");
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      const oversized = files.filter((f) => f.size > MAX_SIZE);
      if (oversized.length) {
        throw new Error(`${oversized.length} file(s) exceed the 10MB limit`);
      }
      const formData = new FormData();
      files.forEach((f) => formData.append("photos", f));
      formData.append("type", activeTab);

      const res = await fetch(`/api/jobs/${jobId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success("Photos uploaded successfully");
    },
    onError: () => {
      toast.error("Failed to upload photos");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      const res = await fetch(`/api/jobs/${jobId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success("Photo removed");
    },
  });

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length) uploadMutation.mutate(files);
    },
    [uploadMutation]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadMutation.mutate(files);
  };

  const beforePhotos = photos.filter((p) => p.type === "before");
  const afterPhotos = photos.filter((p) => p.type === "after");
  const activePhotos = activeTab === "before" ? beforePhotos : afterPhotos;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={activeTab === "before" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("before")}
        >
          Before ({beforePhotos.length})
        </Button>
        <Button
          variant={activeTab === "after" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("after")}
        >
          After ({afterPhotos.length})
        </Button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id={`photo-upload-${activeTab}`}
        />
        <label
          htmlFor={`photo-upload-${activeTab}`}
          className="cursor-pointer"
        >
          <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700">
            {uploadMutation.isPending
              ? "Uploading..."
              : "Drop photos here or click to browse"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            PNG, JPG up to 10MB each
          </p>
        </label>
      </div>

      {activePhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {activePhotos.map((photo, i) => (
            <div
              key={i}
              className="relative group aspect-square rounded-lg overflow-hidden border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`${photo.type} photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => deleteMutation.mutate(photo.url)}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activePhotos.length === 0 && (
        <div className="text-center py-6 text-sm text-slate-400">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          No {activeTab} photos yet
        </div>
      )}
    </div>
  );
}
