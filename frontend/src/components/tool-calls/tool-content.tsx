"use client";

import { useMemo } from "react";
import { JsonSection } from "@/components/json/json-section";
import type { ToolCall } from "@/lib/types";
import { normalizeStep } from "@/lib/tool-call-utils";

interface Props {
  toolCall: ToolCall;
  searchQuery?: string;
  onFullscreen: (which: "args" | "resp") => void;
}

export function ToolContent({ toolCall, searchQuery, onFullscreen }: Props) {
  const step = useMemo(() => normalizeStep(toolCall), [toolCall]);

  if (step.kind === "web_search") {
    return <WebSearchContent toolCall={toolCall} searchQuery={searchQuery} onFullscreen={onFullscreen} />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 min-w-0">
      <JsonSection
        title="Input (Arguments)"
        data={toolCall.arguments || "{}"}
        searchQuery={searchQuery}
        onFullscreen={() => onFullscreen("args")}
      />
      <JsonSection
        title="Output (Response)"
        data={toolCall.response || ""}
        searchQuery={searchQuery}
        onFullscreen={() => onFullscreen("resp")}
      />
    </div>
  );
}

function WebSearchContent({ toolCall, searchQuery, onFullscreen }: Props) {
  // Build a structured view from either format
  const action = getAction(toolCall);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 min-w-0">
      {/* Action summary */}
      <div className="mb-4 p-3 bg-[var(--surface)] border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Action</span>
          <span className="px-2 py-0.5 bg-[var(--tag-green-bg)] text-[var(--tag-green-text)] rounded text-xs font-semibold">
            {action.type}
          </span>
          {action.status && (
            <span className="px-2 py-0.5 bg-[var(--surface-hover)] text-muted rounded text-xs">
              {action.status}
            </span>
          )}
        </div>

        {action.query && (
          <div className="mb-2">
            <span className="text-xs font-semibold text-muted mr-2">Query:</span>
            <span className="text-sm break-all">{action.query}</span>
          </div>
        )}

        {action.url && (
          <div className="mb-2">
            <span className="text-xs font-semibold text-muted mr-2">URL:</span>
            <a href={action.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
              {action.url}
            </a>
          </div>
        )}

        {action.pattern && (
          <div className="mb-2">
            <span className="text-xs font-semibold text-muted mr-2">Pattern:</span>
            <code className="text-sm bg-[var(--surface-hover)] px-1.5 py-0.5 rounded">{action.pattern}</code>
          </div>
        )}

        {action.queries && action.queries.length > 0 && (
          <div className="mb-2">
            <span className="text-xs font-semibold text-muted block mb-1">Search queries:</span>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              {action.queries.map((q, i) => (
                <li key={i} className="break-all text-foreground/80">{q}</li>
              ))}
            </ul>
          </div>
        )}

        {action.sources && action.sources.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-muted block mb-1">Sources:</span>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              {action.sources.map((s, i) => (
                <li key={i}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                    {s.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Raw JSON for full inspection */}
      <JsonSection
        title="Raw Data"
        data={toolCall.raw_items || toolCall}
        searchQuery={searchQuery}
        onFullscreen={() => onFullscreen("args")}
      />
    </div>
  );
}

interface ParsedAction {
  type: string;
  status?: string;
  query?: string;
  url?: string;
  pattern?: string;
  queries?: string[];
  sources?: { url: string }[];
}

function getAction(tc: ToolCall): ParsedAction {
  // New executor format
  if (tc.type === "web_search") {
    return {
      type: tc.action_type || "search",
      status: tc.status,
      query: tc.query,
      url: tc.url,
      pattern: tc.pattern,
      sources: tc.sources,
    };
  }
  // Legacy format — raw_items contains the full web search call
  const raw = tc.raw_items as Record<string, unknown> | undefined;
  if (!raw) return { type: "unknown" };
  const action = raw.action as Record<string, unknown> | undefined;
  if (!action) return { type: "unknown", status: raw.status as string };
  return {
    type: (action.type as string) || "search",
    status: raw.status as string,
    query: action.query as string | undefined,
    url: action.url as string | undefined,
    pattern: action.pattern as string | undefined,
    queries: action.queries as string[] | undefined,
    sources: action.sources as { url: string }[] | undefined,
  };
}
