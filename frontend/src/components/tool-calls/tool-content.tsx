"use client";

import { JsonSection } from "@/components/json/json-section";
import type { ToolCall } from "@/lib/types";

interface Props {
  toolCall: ToolCall;
  searchQuery?: string;
  onFullscreen: (which: "args" | "resp") => void;
}

export function ToolContent({ toolCall, searchQuery, onFullscreen }: Props) {
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
