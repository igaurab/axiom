"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { JsonTree } from "./json-tree";
import { useJsonSearch } from "@/hooks/use-json-search";

interface Props {
  data: unknown;
  title: string;
  initialQuery?: string;
  onClose: () => void;
}

function parseJson(raw: unknown): unknown {
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return typeof raw === "string" ? raw : null;
  }
}

export function FullscreenViewer({ data, title, initialQuery = "", onClose }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const { query, matchCount, currentMatch, search, navigate } = useJsonSearch(bodyRef);

  const parsed = parseJson(data);

  useEffect(() => {
    if (initialQuery) {
      // Delay search to let the tree render
      setTimeout(() => search(initialQuery), 100);
    }
  }, [initialQuery, search]);

  const [treeKey, setTreeKey] = useState(0);
  const [maxOpenDepth, setMaxOpenDepth] = useState<number | undefined>(undefined);

  const foldAll = useCallback((collapse: boolean) => {
    setMaxOpenDepth(collapse ? 0 : Infinity);
    setTreeKey((k) => k + 1);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") {
        if (e.key === "Enter") {
          e.preventDefault();
          navigate(e.shiftKey ? -1 : 1);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, navigate]);

  return (
    <div className="bg-card rounded-xl w-[95%] max-w-[1200px] h-[90vh] flex flex-col shadow-2xl">
      <div className="flex items-center gap-4 px-6 py-3 border-b-2 border-border shrink-0">
        <button
          onClick={onClose}
          className="bg-[var(--surface-hover)] border border-border px-3 py-1.5 rounded-md text-sm font-semibold text-muted hover:bg-[var(--surface)]"
        >
          &larr; Back
        </button>
        <span className="font-bold text-sm text-brand-dark">{title}</span>
        <div className="flex items-center gap-1.5 ml-auto">
          <input
            type="text"
            className="px-2 py-1 border border-border rounded-md text-sm w-44 outline-none bg-card text-foreground focus:border-brand focus:ring-2 focus:ring-brand/15"
            placeholder="Search..."
            defaultValue={initialQuery}
            onChange={(e) => search(e.target.value)}
          />
          <span className="text-xs text-muted font-semibold min-w-[55px]">
            {matchCount > 0
              ? `${currentMatch + 1}/${matchCount}`
              : query
                ? "No matches"
                : ""}
          </span>
          <button onClick={() => navigate(-1)} className="border border-border rounded px-1 py-0.5 text-xs text-muted hover:bg-[var(--surface-hover)]" title="Previous">&#x25B2;</button>
          <button onClick={() => navigate(1)} className="border border-border rounded px-1 py-0.5 text-xs text-muted hover:bg-[var(--surface-hover)]" title="Next">&#x25BC;</button>
          <span className="inline-flex gap-0.5 ml-2">
            <button onClick={() => foldAll(false)} className="border border-border rounded px-1 text-base text-muted hover:bg-[var(--surface-hover)]" title="Expand all">&#x229E;</button>
            <button onClick={() => foldAll(true)} className="border border-border rounded px-1 text-base text-muted hover:bg-[var(--surface-hover)]" title="Collapse all">&#x229F;</button>
          </span>
        </div>
      </div>
      <div ref={bodyRef} className="flex-1 overflow-auto p-6 bg-[var(--surface)]">
        <div className="jt-root font-mono text-sm leading-relaxed">
          {parsed !== null && typeof parsed === "object" ? (
            <JsonTree key={treeKey} data={parsed} defaultOpen maxOpenDepth={maxOpenDepth} />
          ) : (
            <span className="text-json-string">{String(parsed || data || "")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
