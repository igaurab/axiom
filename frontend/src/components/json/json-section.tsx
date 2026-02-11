"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { JsonTree } from "./json-tree";
import { useJsonSearch } from "@/hooks/use-json-search";

interface Props {
  title: string;
  data: unknown;
  searchQuery?: string;
  onFullscreen?: () => void;
}

function parseJson(raw: unknown): unknown {
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return typeof raw === "string" ? raw : null;
  }
}

export function JsonSection({ title, data, searchQuery, onFullscreen }: Props) {
  const parsed = parseJson(data);
  const containerRef = useRef<HTMLDivElement>(null);
  const [treeKey, setTreeKey] = useState(0);
  const [maxOpenDepth, setMaxOpenDepth] = useState<number | undefined>(undefined);
  const { matchCount, currentMatch, search, navigate, clearHighlights } = useJsonSearch(containerRef);
  const prevQuery = useRef("");
  const prevData = useRef(data);

  const foldAll = useCallback((collapse: boolean) => {
    setMaxOpenDepth(collapse ? 0 : Infinity);
    setTreeKey((k) => k + 1);
  }, []);

  // When searchQuery or data changes, expand tree then highlight after render
  useEffect(() => {
    const q = searchQuery?.trim() || "";
    const dataChanged = data !== prevData.current;
    prevData.current = data;

    if (q === prevQuery.current && !dataChanged) return;
    prevQuery.current = q;

    if (!q) {
      clearHighlights();
      // Reset to default collapsed state
      setMaxOpenDepth(undefined);
      setTreeKey((k) => k + 1);
      return;
    }

    // Expand all nodes so text is in the DOM, then search after render
    setMaxOpenDepth(Infinity);
    setTreeKey((k) => k + 1);
  }, [searchQuery, data, clearHighlights]);

  // Run search after tree re-renders with expanded nodes
  useEffect(() => {
    const q = searchQuery?.trim() || "";
    if (!q || maxOpenDepth !== Infinity) return;

    // Wait for React to render the expanded tree
    const raf = requestAnimationFrame(() => {
      search(q);
    });
    return () => cancelAnimationFrame(raf);
  }, [treeKey, searchQuery, maxOpenDepth, search]);

  return (
    <div className="mb-5 last:mb-0">
      <h4 className="text-xs uppercase tracking-wider text-muted font-bold mb-2 flex items-center gap-2">
        {title}
        {matchCount > 0 && (
          <span className="text-xs font-semibold text-foreground/60 normal-case tracking-normal">
            {currentMatch + 1}/{matchCount}
            <button onClick={() => navigate(-1)} className="ml-1.5 hover:text-foreground" title="Previous">&#x25B2;</button>
            <button onClick={() => navigate(1)} className="ml-0.5 hover:text-foreground" title="Next">&#x25BC;</button>
          </span>
        )}
        <span className="ml-auto inline-flex gap-0.5">
          <button
            onClick={() => foldAll(false)}
            className="border border-border rounded px-1 text-base text-muted hover:bg-[var(--surface-hover)] hover:text-foreground"
            title="Expand all"
          >
            &#x229E;
          </button>
          <button
            onClick={() => foldAll(true)}
            className="border border-border rounded px-1 text-base text-muted hover:bg-[var(--surface-hover)] hover:text-foreground"
            title="Collapse all"
          >
            &#x229F;
          </button>
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="border border-border rounded px-1 text-base text-muted hover:bg-[var(--surface-hover)] hover:text-foreground"
              title="View fullscreen"
            >
              &#x26F6;
            </button>
          )}
        </span>
      </h4>
      <div
        ref={containerRef}
        className="jt-root bg-[var(--surface)] border border-border rounded-lg p-3 font-mono text-sm leading-relaxed max-h-[45vh] overflow-auto"
      >
        {parsed === null && !data ? (
          <span className="text-json-null">empty</span>
        ) : typeof parsed === "string" ? (
          <span className="text-json-string">{parsed}</span>
        ) : typeof parsed === "object" ? (
          <JsonTree key={treeKey} data={parsed} defaultOpen maxOpenDepth={maxOpenDepth} />
        ) : (
          String(data)
        )}
      </div>
    </div>
  );
}
