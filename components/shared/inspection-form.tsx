"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera,
  Plus,
  X,
  Check,
  Shield,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const SignaturePad = dynamic(
  () => import("@/components/signature-pad").then((m) => ({ default: m.SignaturePad })),
  { ssr: false, loading: () => <div className="animate-pulse bg-slate-100 rounded h-32" /> }
);

interface InspectionPhoto {
  dataUrl: string;
  location: string;
  damageType: string;
  notes: string;
}

const LOCATIONS = [
  "Front",
  "Rear",
  "Driver Side",
  "Passenger Side",
  "Hood",
  "Roof",
  "Trunk",
  "Interior",
  "Wheels",
];

const DAMAGE_TYPES = [
  "Scratch",
  "Dent",
  "Chip",
  "Stain",
  "Crack",
  "Fading",
  "Swirl Marks",
  "Other",
];

export function InspectionForm({
  jobId,
  onComplete,
}: {
  jobId: string;
  onComplete?: () => void;
}) {
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const [condition, setCondition] = useState("");
  const [odometer, setOdometer] = useState("");
  const [signature, setSignature] = useState("");
  const [signedName, setSignedName] = useState("");
  const [currentPhoto, setCurrentPhoto] = useState<{
    dataUrl: string;
    location: string;
    damageType: string;
    notes: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Load existing inspection if any
  const { data: existing } = useQuery({
    queryKey: ["inspection", jobId],
    queryFn: () => fetch(`/api/inspections?jobId=${jobId}`).then((r) => r.json()),
    enabled: !!jobId,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection", jobId] });
      toast.success("Pre-service inspection saved");
      onComplete?.();
    },
    onError: () => toast.error("Failed to save inspection"),
  });

  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCurrentPhoto({
        dataUrl: reader.result as string,
        location: "",
        damageType: "",
        notes: "",
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addPhoto = () => {
    if (!currentPhoto || !currentPhoto.location) {
      toast.error("Please select a location for this photo");
      return;
    }
    setPhotos([...photos, currentPhoto as InspectionPhoto]);
    setCurrentPhoto(null);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!signature) {
      toast.error("Customer signature is required");
      return;
    }
    if (!signedName) {
      toast.error("Customer name is required");
      return;
    }

    saveMutation.mutate({
      jobId,
      photos,
      condition,
      odometer: odometer || undefined,
      signature,
      signedName,
    });
  };

  if (existing && existing.signedAt) {
    return (
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
        <Shield className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <h3 className="font-semibold text-emerald-700">Inspection Complete</h3>
        <p className="text-sm text-emerald-600 mt-1">
          Signed by {existing.signedName} on{" "}
          {new Date(existing.signedAt).toLocaleDateString()}
        </p>
        {existing.photos && (
          <p className="text-xs text-emerald-500 mt-1">
            {JSON.parse(existing.photos).length} photos documented
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-emerald-500" />
        <h3 className="font-semibold text-slate-900">Pre-Service Inspection</h3>
      </div>

      {/* Photo capture */}
      <div>
        <Label className="text-sm font-medium">Damage Documentation</Label>
        <p className="text-xs text-slate-500 mb-2">
          Photograph any existing damage before starting work.
        </p>

        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {photos.map((photo, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.dataUrl}
                  alt={photo.location}
                  className="w-full h-20 object-cover rounded-lg border border-slate-200"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-b-lg">
                  {photo.location} — {photo.damageType}
                </div>
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Current photo annotation */}
        {currentPhoto && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhoto.dataUrl}
              alt="captured"
              className="w-full h-32 object-cover rounded-lg mb-3"
            />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <Label className="text-xs">Location</Label>
                <select
                  value={currentPhoto.location}
                  onChange={(e) =>
                    setCurrentPhoto({ ...currentPhoto, location: e.target.value })
                  }
                  className="w-full text-sm border rounded-lg px-2 py-1.5 mt-0.5"
                >
                  <option value="">Select...</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Damage Type</Label>
                <select
                  value={currentPhoto.damageType}
                  onChange={(e) =>
                    setCurrentPhoto({ ...currentPhoto, damageType: e.target.value })
                  }
                  className="w-full text-sm border rounded-lg px-2 py-1.5 mt-0.5"
                >
                  <option value="">Select...</option>
                  {DAMAGE_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Input
              placeholder="Additional notes..."
              value={currentPhoto.notes}
              onChange={(e) =>
                setCurrentPhoto({ ...currentPhoto, notes: e.target.value })
              }
              className="text-sm mb-2"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPhoto(null)}
                className="flex-1"
              >
                Discard
              </Button>
              <Button size="sm" onClick={addPhoto} className="flex-1">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Photo
              </Button>
            </div>
          </div>
        )}

        {!currentPhoto && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileCapture}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" /> Take Photo
            </Button>
          </>
        )}
      </div>

      {/* Condition notes */}
      <div>
        <Label className="text-sm font-medium">General Condition Notes</Label>
        <Textarea
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="Overall vehicle condition, areas of concern..."
          className="mt-1"
          rows={3}
        />
      </div>

      {/* Odometer */}
      <div>
        <Label className="text-sm font-medium">Odometer Reading (optional)</Label>
        <Input
          type="number"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          placeholder="e.g., 42500"
          className="mt-1"
        />
      </div>

      {/* Customer acknowledgment */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs text-slate-600 mb-3">
          I acknowledge that the condition of my vehicle has been documented as
          shown above. Any pre-existing damage noted is not the responsibility of
          Fresh Path Mobile Detailing.
        </p>

        <div className="mb-3">
          <Label className="text-sm font-medium">Customer Name</Label>
          <Input
            value={signedName}
            onChange={(e) => setSignedName(e.target.value)}
            placeholder="Full name"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Customer Signature</Label>
          <div className="mt-1">
            <SignaturePad
              onSave={(sig) => setSignature(sig)}
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={saveMutation.isPending || !signature || !signedName}
      >
        {saveMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Check className="w-4 h-4 mr-2" />
        )}
        Complete Inspection
      </Button>
    </div>
  );
}
