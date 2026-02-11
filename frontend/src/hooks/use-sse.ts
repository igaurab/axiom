"use client";

import { useEffect, useRef, useCallback } from "react";
import { apiUrl } from "@/lib/api/client";

interface UseSSEOptions {
  onProgress?: (data: Record<string, unknown>) => void;
  onComplete?: () => void;
  onError?: () => void;
  enabled?: boolean;
}

export function useSSE(runId: number, options: UseSSEOptions) {
  const { onProgress, onComplete, onError, enabled = true } = options;
  const esRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !runId) return;

    const es = new EventSource(apiUrl(`/api/runs/${runId}/stream`));
    esRef.current = es;

    es.addEventListener("progress", (e) => {
      try {
        const data = JSON.parse(e.data);
        onProgress?.(data);
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("complete", () => {
      es.close();
      onComplete?.();
    });

    es.addEventListener("error", () => {
      es.close();
      onError?.();
    });

    return cleanup;
  }, [runId, enabled, onProgress, onComplete, onError, cleanup]);

  return { close: cleanup };
}
