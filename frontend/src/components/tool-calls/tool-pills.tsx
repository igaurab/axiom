"use client";

import type { ToolCall } from "@/lib/types";

interface Props {
  toolCalls: ToolCall[] | null;
  onClickTool: (idx: number) => void;
}

export function ToolPills({ toolCalls, onClickTool }: Props) {
  if (!toolCalls?.length) return null;

  return (
    <div className="text-sm text-muted mt-2 p-2 px-3 bg-[var(--surface-hover)] rounded-md break-words">
      {toolCalls.map((tc, i) => (
        <span
          key={i}
          onClick={(e) => { e.stopPropagation(); onClickTool(i); }}
          className="inline-block px-1.5 py-0.5 m-0.5 bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)] rounded text-xs font-semibold cursor-pointer transition-all hover:bg-primary hover:text-primary-foreground hover:-translate-y-px hover:shadow-md"
        >
          {tc.name || "unknown"}
        </span>
      ))}
    </div>
  );
}
