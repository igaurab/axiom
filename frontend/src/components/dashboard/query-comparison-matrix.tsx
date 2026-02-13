"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RunAnalyticsOut, QueryGradeRow, GradeValue } from "@/lib/types";
import { gradesApi } from "@/lib/api/grades";
import { GradeButton } from "@/components/grading/grade-button";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { cn } from "@/lib/utils";

type Filter = "all" | "disagreements";

interface Props {
  runs: RunAnalyticsOut[];
  queryGrades: QueryGradeRow[];
}

const gradeBadge: Record<string, { label: string; cls: string }> = {
  correct: { label: "Correct", cls: "bg-grade-correct-bg text-grade-correct-text" },
  partial: { label: "Partial", cls: "bg-grade-partial-bg text-grade-partial-text" },
  wrong: { label: "Wrong", cls: "bg-grade-wrong-bg text-grade-wrong-text" },
};

function isDisagreement(row: QueryGradeRow): boolean {
  const vals = Object.values(row.grades).filter(Boolean);
  return vals.length > 1 && new Set(vals).size > 1;
}

export function QueryComparisonMatrix({ runs, queryGrades }: Props) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("disagreements");
  const [rows, setRows] = useState<QueryGradeRow[]>(queryGrades);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    setRows(queryGrades);
  }, [queryGrades]);

  const selected = useMemo(
    () => rows.find((r) => r.query_id === selectedId) || null,
    [rows, selectedId]
  );

  const gradeMutation = useMutation({
    mutationFn: ({
      resultId,
      grade,
    }: {
      resultId: number;
      grade: GradeValue;
      runId: number;
      queryId: number;
    }) =>
      gradesApi.upsert(resultId, { grade }),
    onSuccess: (_, variables) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.query_id !== variables.queryId) return row;
          return {
            ...row,
            grades: {
              ...row.grades,
              [variables.runId]: variables.grade,
            },
          };
        })
      );
      queryClient.invalidateQueries({ queryKey: ["compare-analytics"] });
    },
  });

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filter === "disagreements") return isDisagreement(row);
      return true;
    });
  }, [rows, filter]);

  if (!rows.length) return null;

  const disagreementCount = rows.filter(isDisagreement).length;
  const filters: { key: Filter; label: string }[] = [
    { key: "disagreements", label: "Disagreements" },
    { key: "all", label: "All" },
  ];

  return (
    <>
      <div className="bg-card rounded-xl p-6 px-8 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 pb-2 border-b-2 border-border text-brand-dark">
          Query Comparison Matrix
        </h2>

        <div className="flex items-center gap-2 mb-3">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-brand text-white"
                  : "bg-[var(--surface)] text-muted-foreground hover:bg-[var(--surface-hover)]"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            Showing {filtered.length} of {rows.length} queries
            {disagreementCount > 0 && (
              <>
                {" "}&middot; {disagreementCount} disagreement{disagreementCount !== 1 ? "s" : ""}
              </>
            )}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 bg-[var(--surface)] font-semibold min-w-[220px]">Query</th>
                {runs.map((r) => (
                  <th key={r.run_id} className="text-center p-2 bg-[var(--surface)] font-semibold whitespace-nowrap">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const disagree = isDisagreement(row);
                return (
                  <tr
                    key={row.query_id}
                    className={cn(
                      "border-b border-border cursor-pointer hover:bg-[var(--surface-hover)] transition-colors",
                      disagree && "border-l-2 border-l-amber-400"
                    )}
                    onClick={() => setSelectedId(row.query_id)}
                  >
                    <td className="p-2">
                      <span className="font-semibold text-muted-foreground mr-1.5">Q{row.ordinal}</span>
                      <span className="text-foreground">
                        {row.query_text.length > 90 ? `${row.query_text.slice(0, 90)}...` : row.query_text}
                      </span>
                      {row.tag && (
                        <span className="ml-2 text-xs text-muted-foreground bg-[var(--surface)] px-1.5 py-0.5 rounded">
                          {row.tag}
                        </span>
                      )}
                    </td>
                    {runs.map((r) => {
                      const grade = row.grades[r.run_id];
                      if (!grade) {
                        return (
                          <td key={r.run_id} className="p-2 text-center">
                            <span className="text-muted-foreground">-</span>
                          </td>
                        );
                      }
                      const badge = gradeBadge[grade];
                      return (
                        <td key={r.run_id} className="p-2 text-center">
                          <span className={`inline-flex items-center rounded-xl px-2 py-0.5 text-xs font-semibold ${badge?.cls ?? ""}`}>
                            {badge?.label ?? grade}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={1 + runs.length} className="text-center py-6 text-muted-foreground">
                    No queries match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <QueryCompareModal
          row={selected}
          runs={runs}
          onClose={() => setSelectedId(null)}
          onGrade={(runId, grade) => {
            const resultId = selected.result_ids?.[runId];
            if (!resultId) return;
            gradeMutation.mutate({ resultId, grade, runId, queryId: selected.query_id });
          }}
          gradePending={gradeMutation.isPending}
          onNavigate={(dir) => {
            const idx = filtered.findIndex((r) => r.query_id === selectedId);
            const next = idx + dir;
            if (next >= 0 && next < filtered.length) {
              setSelectedId(filtered[next].query_id);
            }
          }}
        />
      )}
    </>
  );
}

function QueryCompareModal({
  row,
  runs,
  onClose,
  onGrade,
  gradePending,
  onNavigate,
}: {
  row: QueryGradeRow;
  runs: RunAnalyticsOut[];
  onClose: () => void;
  onGrade: (runId: number, grade: GradeValue) => void;
  gradePending: boolean;
  onNavigate: (direction: number) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState(false);

  // Reset tab when navigating to a different query
  useEffect(() => {
    setActiveTab(0);
  }, [row.query_id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && runs.length > 1) {
        e.preventDefault();
        setActiveTab((prev) =>
          e.shiftKey
            ? (prev - 1 + runs.length) % runs.length
            : (prev + 1) % runs.length
        );
      }
      if (e.key === "n") onNavigate(1);
      if (e.key === "p") onNavigate(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, runs.length, onNavigate]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card rounded-xl w-[95%] max-w-[1100px] h-[82vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-6 pb-0">
          <h3 className="text-xl font-semibold">Query #{row.ordinal}</h3>
          <button className="text-2xl text-muted hover:text-foreground" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="text-base p-3 bg-[var(--surface)] rounded-lg border-l-4 border-brand mb-4">
            <MarkdownRenderer content={row.query_text || ""} />
          </div>

          <div className="mb-4">
            <h4 className="text-muted text-sm font-semibold mb-2">Expected Answer</h4>
            <MarkdownRenderer content={row.expected_answer || ""} />
            {row.comments && (
              <div className="mt-2 px-3 py-1.5 bg-[var(--tag-orange-bg)] border-l-[3px] border-[var(--tag-orange-text)] rounded text-sm text-[var(--tag-orange-text)]">
                <strong>Note:</strong> {row.comments}
              </div>
            )}
          </div>

          <div className="flex bg-[var(--surface-hover)] border-b-2 border-border rounded-t-lg overflow-x-auto">
            {runs.map((run, idx) => {
              const grade = row.grades[run.run_id] || "";
              const badge = grade ? gradeBadge[grade] : null;
              return (
                <button
                  key={run.run_id}
                  className={cn(
                    "px-4 py-2.5 font-semibold text-sm text-muted border-b-[3px] border-transparent -mb-[2px] whitespace-nowrap transition-colors",
                    idx === activeTab
                      ? "text-foreground bg-card border-b-brand"
                      : "hover:bg-[var(--surface)] hover:text-foreground"
                  )}
                  onClick={() => setActiveTab(idx)}
                >
                  {run.label}
                  {badge && (
                    <span className={`ml-2 inline-flex items-center rounded-xl px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {runs.map((run, idx) => {
            if (idx !== activeTab) return null;
            const payload = row.responses?.[run.run_id];
            const activeGrade = row.grades[run.run_id] as GradeValue | undefined;
            const canGrade = Boolean(row.result_ids?.[run.run_id]);

            return (
              <div key={run.run_id} className="p-4 bg-[var(--surface)] border border-border rounded-b-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-muted">Agent Response</span>
                  <label
                    className={cn(
                      "inline-flex items-center gap-2 text-xs",
                      canGrade ? "text-foreground" : "text-muted"
                    )}
                    title={canGrade ? "Toggle grade controls" : "No result found for this run"}
                  >
                    <span>Edit grades</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={editMode}
                      onClick={() => canGrade && setEditMode((v) => !v)}
                      disabled={!canGrade}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        editMode ? "bg-brand" : "bg-border",
                        !canGrade && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          editMode ? "translate-x-4" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </label>
                </div>

                {editMode && canGrade && (
                  <div className="flex gap-2 mb-3">
                    {(["correct", "partial", "wrong"] as GradeValue[]).map((g) => (
                      <GradeButton
                        key={g}
                        grade={g}
                        active={activeGrade === g}
                        onClick={() => onGrade(run.run_id, g)}
                      />
                    ))}
                    {gradePending && <span className="text-xs text-muted self-center">Saving...</span>}
                  </div>
                )}

                {payload?.error ? (
                  <div className="text-destructive font-semibold mb-3">ERROR: {payload.error}</div>
                ) : null}
                <div className="bg-card border-2 border-border rounded-lg p-4 max-h-[360px] overflow-y-auto whitespace-pre-wrap text-sm">
                  <MarkdownRenderer content={payload?.agent_response || "N/A"} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
