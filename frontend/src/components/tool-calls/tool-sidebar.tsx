"use client";

import { useState, useMemo, type ReactNode } from "react";
import type { ToolCall } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  toolCalls: ToolCall[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  onSearchChange: (q: string) => void;
  searchQuery: string;
}

function getSearchText(tc: ToolCall): string {
  let text = "";
  if (tc.arguments) {
    try {
      const parsed = typeof tc.arguments === "string" ? JSON.parse(tc.arguments) : tc.arguments;
      text += JSON.stringify(parsed);
    } catch { text += String(tc.arguments); }
  }
  if (tc.response) {
    try {
      const parsed = typeof tc.response === "string" ? JSON.parse(tc.response) : tc.response;
      text += " " + JSON.stringify(parsed);
    } catch { text += " " + String(tc.response); }
  }
  return text;
}

/** Count occurrences of `ql` (lowercased) in `text` */
function countMatches(text: string, ql: string): number {
  if (!ql) return 0;
  const lower = text.toLowerCase();
  let count = 0;
  let pos = lower.indexOf(ql);
  while (pos >= 0) {
    count++;
    pos = lower.indexOf(ql, pos + ql.length);
  }
  return count;
}

/** Render snippet with highlighted match text */
function highlightSnippet(snippet: string, query: string): ReactNode {
  if (!query || !snippet) return snippet;
  const ql = query.toLowerCase();
  const parts: ReactNode[] = [];
  const lower = snippet.toLowerCase();
  let lastIdx = 0;
  let pos = lower.indexOf(ql);
  let key = 0;
  while (pos >= 0) {
    if (pos > lastIdx) parts.push(snippet.slice(lastIdx, pos));
    parts.push(
      <mark key={key++} className="bg-yellow-400/50 text-inherit rounded-sm px-px">
        {snippet.slice(pos, pos + query.length)}
      </mark>
    );
    lastIdx = pos + query.length;
    pos = lower.indexOf(ql, lastIdx);
  }
  if (lastIdx < snippet.length) parts.push(snippet.slice(lastIdx));
  return <>{parts}</>;
}

export function ToolSidebar({ toolCalls, activeIdx, onSelect, onSearchChange, searchQuery }: Props) {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const filtered = useMemo(() => {
    if (!localQuery.trim()) return toolCalls.map((_, i) => ({ idx: i, match: true, snippet: "", matchCount: 0 }));
    const ql = localQuery.toLowerCase();
    return toolCalls.map((tc, i) => {
      const text = getSearchText(tc);
      const pos = text.toLowerCase().indexOf(ql);
      let snippet = "";
      const mc = countMatches(text, ql);
      if (pos >= 0) {
        const start = Math.max(0, pos - 20);
        const end = Math.min(text.length, pos + localQuery.length + 40);
        snippet = (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
      }
      return { idx: i, match: pos >= 0, snippet, matchCount: mc };
    });
  }, [toolCalls, localQuery]);

  return (
    <div className="w-60 shrink-0 border-r-2 border-border flex flex-col bg-[var(--surface)]">
      <div className="p-2 border-b border-border shrink-0">
        <input
          type="text"
          className="w-full px-2 py-1.5 border border-border rounded-md text-sm outline-none bg-card text-foreground focus:border-brand focus:ring-2 focus:ring-brand/15"
          placeholder="Search output..."
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            onSearchChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setLocalQuery("");
              onSearchChange("");
            }
          }}
        />
      </div>
      {localQuery.trim() && (() => {
        const matchingItems = filtered.filter((f) => f.match);
        const totalMatches = filtered.reduce((sum, f) => sum + f.matchCount, 0);
        return (
          <div className="px-3 py-1.5 border-b border-border text-xs text-muted bg-[var(--surface)] shrink-0">
            {totalMatches} {totalMatches === 1 ? "match" : "matches"} in {matchingItems.length} of {toolCalls.length} tool {toolCalls.length === 1 ? "call" : "calls"}
          </div>
        );
      })()}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {filtered.map((item) =>
          item.match ? (
            <div
              key={item.idx}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-border text-sm transition-colors",
                item.idx === activeIdx
                  ? "bg-[var(--tag-blue-bg)] border-l-[3px] border-l-brand font-semibold"
                  : "hover:bg-[var(--surface-hover)]"
              )}
              onClick={() => onSelect(item.idx)}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  item.idx === activeIdx
                    ? "bg-brand text-white"
                    : "bg-border text-muted"
                )}
              >
                {item.idx + 1}
              </span>
              <div className="overflow-hidden flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate">{toolCalls[item.idx].name || "unknown"}</span>
                  {item.matchCount > 0 && (
                    <span className="shrink-0 text-[10px] bg-yellow-400/30 text-foreground/70 rounded px-1 font-medium">
                      {item.matchCount} {item.matchCount === 1 ? "match" : "matches"}
                    </span>
                  )}
                </div>
                {item.snippet && (
                  <div className="text-xs text-muted truncate mt-0.5">
                    {highlightSnippet(item.snippet, localQuery)}
                  </div>
                )}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
