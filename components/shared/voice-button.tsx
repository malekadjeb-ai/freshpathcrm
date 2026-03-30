"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  onProcessing?: (text: string) => Promise<void>;
  className?: string;
  size?: "sm" | "default" | "lg";
  floating?: boolean;
}

export function VoiceButton({
  onTranscript,
  onProcessing,
  className,
  size = "default",
  floating = false,
}: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted") {
        toast.error(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const handleConfirm = async () => {
    if (!transcript.trim()) return;

    stopListening();

    if (onProcessing) {
      setIsProcessing(true);
      try {
        await onProcessing(transcript);
      } finally {
        setIsProcessing(false);
      }
    } else {
      onTranscript(transcript);
    }

    setTranscript("");
  };

  const handleCancel = () => {
    stopListening();
    setTranscript("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const sizeClasses = {
    sm: "w-8 h-8",
    default: "w-10 h-10",
    lg: "w-14 h-14",
  };

  if (floating) {
    return (
      <>
        {/* Floating mic button */}
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={cn(
            "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 rounded-full shadow-lg transition-all duration-200",
            sizeClasses[size],
            "flex items-center justify-center",
            isListening
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-emerald-500 hover:bg-emerald-600",
            className
          )}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : isListening ? (
            <MicOff className="w-5 h-5 text-white" />
          ) : (
            <Mic className="w-5 h-5 text-white" />
          )}
        </button>

        {/* Transcript overlay */}
        {(isListening || transcript) && (
          <div className="fixed bottom-36 md:bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-30 bg-white rounded-xl shadow-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
              {isListening && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
              {isListening ? "Listening..." : "Review transcript"}
            </div>
            <p className="text-sm text-slate-900 min-h-[40px]">
              {transcript || "Speak now..."}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={!transcript.trim()}
                className="flex-1"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Confirm
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Inline version
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        className={cn(
          "rounded-full flex items-center justify-center transition-all",
          sizeClasses[size],
          isListening
            ? "bg-red-100 text-red-600 animate-pulse"
            : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600"
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
      {transcript && (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-slate-600 max-w-[200px] truncate">
            {transcript}
          </span>
          <button
            onClick={handleConfirm}
            className="p-1 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
