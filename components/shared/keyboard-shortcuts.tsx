"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Global keyboard shortcuts that work without opening the command palette
export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case "c":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("quick-add", { detail: "customer" }));
            break;
          case "e":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("quick-add", { detail: "estimate" }));
            break;
          case "i":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("quick-add", { detail: "invoice" }));
            break;
          case "j":
            e.preventDefault();
            router.push("/jobs/new");
            break;
          case "l":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("open-quick-log"));
            break;
          case "n":
            e.preventDefault();
            router.push("/leads");
            break;
          case "t":
            e.preventDefault();
            router.push("/tasks");
            break;
          case "d":
            e.preventDefault();
            router.push("/dashboard");
            break;
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router]);

  return null;
}
