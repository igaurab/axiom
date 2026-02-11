"use client";

import { useCallback } from "react";
import type { ResultOut, GradeValue } from "@/lib/types";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { GradeButton } from "./grade-button";
import { ReasoningDisplay } from "./reasoning-display";
import { ToolPills } from "@/components/tool-calls/tool-pills";
import { cn } from "@/lib/utils";

interface Props {
  result: ResultOut;
  onGrade: (resultId: number, grade: GradeValue) => void;
  onOpenToolModal: (resultId: number, idx: number) => void;
}

const borderColors: Record<string, string> = {
  correct: "border-grade-correct-border bg-grade-correct-bg",
  partial: "border-grade-partial-border bg-grade-partial-bg",
  wrong: "border-grade-wrong-border bg-grade-wrong-bg",
};

export function GradingCard({ result, onGrade, onOpenToolModal }: Props) {
  const q = result.query;
  const grade = result.grade?.grade || "";
  const tokens = result.usage?.total_tokens ? result.usage.total_tokens.toLocaleString() : "N/A";
  const time = result.execution_time_seconds ? result.execution_time_seconds.toFixed(1) + "s" : "N/A";

  const handleToolClick = useCallback(
    (idx: number) => onOpenToolModal(result.id, idx),
    [result.id, onOpenToolModal]
  );

  return (
    <div id={`result-${result.id}`} className="bg-card rounded-xl p-6 px-8 mb-6 shadow-sm">
      {/* Header */}
      <div className="border-b-2 border-border pb-3 mb-4 flex justify-between items-center">
        <span className="text-lg font-bold">
          Query #{q?.ordinal || result.query_id}
          {q?.tag && (
            <span className="ml-2 inline-block px-2 py-0.5 rounded-xl text-xs font-semibold bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]">
              {q.tag}
            </span>
          )}
        </span>
      </div>

      {/* Query text */}
      <div className="text-base p-3 bg-[var(--surface)] rounded-lg border-l-4 border-brand mb-4">
        <MarkdownRenderer content={q?.query_text || ""} />
      </div>

      {/* Expected answer */}
      <div className="mb-4">
        <h4 className="text-muted text-sm font-semibold mb-2">Expected Answer</h4>
        <MarkdownRenderer content={q?.expected_answer || ""} />
        {q?.comments && (
          <div className="mt-2 px-3 py-1.5 bg-[var(--tag-orange-bg)] border-l-[3px] border-[var(--tag-orange-text)] rounded text-sm text-[var(--tag-orange-text)]">
            <strong>Note:</strong> {q.comments}
          </div>
        )}
      </div>

      {/* Agent response */}
      <h4 className="text-sm font-semibold mb-2">Agent Response</h4>
      <div
        className={cn(
          "bg-[var(--surface)] border-2 border-border rounded-lg p-4 mb-3 max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm",
          grade && borderColors[grade]
        )}
      >
        {result.error ? (
          <div className="text-destructive font-semibold">ERROR: {result.error}</div>
        ) : (
          <MarkdownRenderer content={result.agent_response || "N/A"} />
        )}
      </div>

      {/* Grade buttons */}
      <div className="flex gap-2 mt-3">
        {(["correct", "partial", "wrong"] as GradeValue[]).map((g) => (
          <GradeButton
            key={g}
            grade={g}
            active={grade === g}
            onClick={() => onGrade(result.id, g)}
          />
        ))}
      </div>

      {/* Meta */}
      <div className="mt-3 pt-3 border-t border-border text-sm text-muted flex gap-6 flex-wrap">
        <span><strong>Time:</strong> {time}</span>
        <span><strong>Tokens:</strong> {tokens}</span>
        <span><strong>Tool Calls:</strong> {(result.tool_calls || []).length}</span>
      </div>

      <ToolPills toolCalls={result.tool_calls} onClickTool={handleToolClick} />
      <ReasoningDisplay reasoning={result.reasoning} />
    </div>
  );
}
