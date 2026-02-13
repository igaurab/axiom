"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ResultOut, RunDetailOut, GradeValue, QueryOut } from "@/lib/types";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { GradeButton } from "./grade-button";
import { ReasoningDisplay } from "./reasoning-display";
import { ToolPills } from "@/components/tool-calls/tool-pills";
import { countByKind } from "@/lib/tool-call-utils";
import { cn } from "@/lib/utils";

const borderColors: Record<string, string> = {
  correct: "border-grade-correct-border bg-grade-correct-bg",
  partial: "border-grade-partial-border bg-grade-partial-bg",
  wrong: "border-grade-wrong-border bg-grade-wrong-bg",
};

const dotColors: Record<string, string> = {
  correct: "bg-green-500",
  partial: "bg-yellow-400",
  wrong: "bg-red-500",
  not_graded: "bg-muted-light",
};

function AgentDropdown({
  runs,
  resultsByRun,
  selectedIdx,
  onChange,
}: {
  runs: RunDetailOut[];
  resultsByRun: Record<number, ResultOut>;
  selectedIdx: number;
  onChange: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedRun = runs[selectedIdx];
  const selectedResult = selectedRun ? resultsByRun[selectedRun.id] : undefined;
  const selectedGrade = selectedResult?.grade?.grade || "not_graded";

  return (
    <div ref={ref} className="relative mb-3">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-[var(--surface)] text-sm font-semibold hover:bg-[var(--surface-hover)] transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotColors[selectedGrade])} />
        <span className="truncate flex-1 text-left">{selectedRun?.label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cn("shrink-0 transition-transform", open && "rotate-180")}>
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
          {runs.map((run, idx) => {
            const r = resultsByRun[run.id];
            const grade = r?.grade?.grade || "not_graded";
            return (
              <button
                key={run.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-[var(--surface-hover)] transition-colors",
                  idx === selectedIdx && "bg-[var(--surface)] font-bold"
                )}
                onClick={() => { onChange(idx); setOpen(false); }}
              >
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotColors[grade])} />
                <span className="truncate">{run.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Props {
  queryId: number;
  query: QueryOut;
  runs: RunDetailOut[];
  resultsByRun: Record<number, ResultOut>;
  initialLeft: number;
  initialRight: number;
  onGrade: (resultId: number, grade: GradeValue, queryId: number, tabIdx: number) => void;
  onOpenToolModal: (resultId: number, idx: number, runLabel: string) => void;
  onClose: () => void;
}

function AgentPanel({
  run,
  result,
  tabIdx,
  queryId,
  onGrade,
  onOpenToolModal,
}: {
  run: RunDetailOut;
  result: ResultOut | undefined;
  tabIdx: number;
  queryId: number;
  onGrade: Props["onGrade"];
  onOpenToolModal: Props["onOpenToolModal"];
}) {
  if (!result) {
    return <div className="p-4 text-muted-light italic">No data for this query</div>;
  }

  const grade = result.grade?.grade || "";
  const tokens = result.usage?.total_tokens ? result.usage.total_tokens.toLocaleString() : "N/A";
  const time = result.execution_time_seconds ? result.execution_time_seconds.toFixed(1) + "s" : "N/A";
  const counts = countByKind(result.tool_calls);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Response */}
      <div
        className={cn(
          "bg-[var(--surface)] border-2 border-border rounded-lg p-4 mb-3 overflow-y-auto whitespace-pre-wrap text-sm flex-1 min-h-0",
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
      <div className="flex gap-2 mt-1">
        {(["correct", "partial", "wrong"] as GradeValue[]).map((g) => (
          <GradeButton
            key={g}
            grade={g}
            active={grade === g}
            onClick={() => onGrade(result.id, g, queryId, tabIdx)}
          />
        ))}
      </div>

      {/* Stats */}
      <div className="mt-3 pt-3 border-t border-border text-sm text-muted flex gap-6 flex-wrap">
        <span><strong>Time:</strong> {time}</span>
        <span><strong>Tokens:</strong> {tokens}</span>
        {counts.tools > 0 && <span><strong>Tool Calls:</strong> {counts.tools}</span>}
        {counts.searches > 0 && <span><strong>Web Searches:</strong> {counts.searches}</span>}
        {counts.tools === 0 && counts.searches === 0 && <span><strong>Tool Calls:</strong> 0</span>}
      </div>

      {/* Tool pills & reasoning */}
      <ToolPills
        toolCalls={result.tool_calls}
        onClickTool={(i) => onOpenToolModal(result.id, i, run.label)}
      />
      <ReasoningDisplay reasoning={result.reasoning} />
    </div>
  );
}

export function SplitCompareModal({
  queryId,
  query,
  runs,
  resultsByRun,
  initialLeft,
  initialRight,
  onGrade,
  onOpenToolModal,
  onClose,
}: Props) {
  const [leftIdx, setLeftIdx] = useState(initialLeft);
  const [rightIdx, setRightIdx] = useState(initialRight);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const leftRun = runs[leftIdx];
  const rightRun = runs[rightIdx];
  const leftResult = leftRun ? resultsByRun[leftRun.id] : undefined;
  const rightResult = rightRun ? resultsByRun[rightRun.id] : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-card rounded-2xl border border-border shadow-2xl flex flex-col"
        style={{ width: "95vw", maxWidth: 1400, height: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <span className="text-lg font-bold">
            Query #{query.ordinal || queryId}
            {query.tag && (
              <span className="ml-2 inline-block px-2 py-0.5 rounded-xl text-xs font-semibold bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]">
                {query.tag}
              </span>
            )}
          </span>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 min-h-0 divide-x divide-border">
          {/* Left panel */}
          <div className="flex-1 flex flex-col min-w-0 p-4">
            <AgentDropdown
              runs={runs}
              resultsByRun={resultsByRun}
              selectedIdx={leftIdx}
              onChange={setLeftIdx}
            />
            <AgentPanel
              run={leftRun}
              result={leftResult}
              tabIdx={leftIdx}
              queryId={queryId}
              onGrade={onGrade}
              onOpenToolModal={onOpenToolModal}
            />
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col min-w-0 p-4">
            <AgentDropdown
              runs={runs}
              resultsByRun={resultsByRun}
              selectedIdx={rightIdx}
              onChange={setRightIdx}
            />
            <AgentPanel
              run={rightRun}
              result={rightResult}
              tabIdx={rightIdx}
              queryId={queryId}
              onGrade={onGrade}
              onOpenToolModal={onOpenToolModal}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-2 border-t border-border text-xs text-muted shrink-0">
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-border font-mono text-xs">Esc</kbd>
          <span className="ml-1.5">close</span>
        </div>
      </div>
    </div>
  );
}
