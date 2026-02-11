"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { comparisonsApi } from "@/lib/api/comparisons";
import { exportApi } from "@/lib/api/export";
import { PageHeader } from "@/components/layout/page-header";
import { GradingView } from "@/components/grading/grading-view";
import { CompareDashboard } from "@/components/dashboard/compare-dashboard";
import { ConfigView } from "@/components/runs/config-view";
import { cn } from "@/lib/utils";
import { GitCompareArrows } from "lucide-react";

type Mode = "grading" | "dashboard" | "config";

export default function CompareDetailPage() {
  const params = useParams();
  const comparisonId = Number(params.id);
  const [mode, setMode] = useState<Mode>("grading");

  const { data: comparison, isLoading, isError } = useQuery({
    queryKey: ["comparison", comparisonId],
    queryFn: () => comparisonsApi.get(comparisonId),
    enabled: !isNaN(comparisonId),
  });

  if (isLoading) {
    return (
      <>
        <PageHeader title="Compare Runs" />
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
          <div className="skeleton h-5 w-48 mx-auto mb-2" />
          <div className="skeleton h-4 w-32 mx-auto" />
        </div>
      </>
    );
  }

  if (isError || !comparison) {
    return (
      <>
        <PageHeader title="Compare Runs" />
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
          <GitCompareArrows size={40} className="mx-auto text-muted-light mb-3" />
          <p className="text-muted text-sm">Comparison not found.</p>
        </div>
      </>
    );
  }

  const runIds = comparison.run_ids;

  return (
    <>
      <PageHeader title={comparison.name || `Comparison #${comparison.id}`} subtitle={
        <div className="text-sm text-muted mt-1">Dataset: {comparison.suite_name} &bull; {comparison.run_count} runs</div>
      } />

      <div className="flex gap-1 mb-4 bg-[var(--surface-hover)] border border-border rounded-lg p-1 w-fit">
        {(["grading", "dashboard", "config"] as Mode[]).map((m) => (
          <button key={m} className={cn("px-4 py-1.5 rounded-md text-sm font-semibold transition-colors", mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-[var(--surface)]")} onClick={() => setMode(m)}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {mode === "grading" && (
        <>
          <GradingView runIds={runIds} compare />
          <ExportBar runIds={runIds} />
        </>
      )}
      {mode === "dashboard" && (
        <>
          <CompareDashboard runIds={runIds} />
          <ExportBar runIds={runIds} />
        </>
      )}
      {mode === "config" && <ConfigView runIds={runIds} />}
    </>
  );
}

function ExportBar({ runIds }: { runIds: number[] }) {
  return (
    <div className="flex gap-2 mt-6 pt-4 border-t border-border">
      <a href={exportApi.htmlUrl(runIds)} target="_blank" className="px-4 py-2 bg-card border border-border rounded-lg font-semibold text-sm hover:bg-[var(--surface-hover)] no-underline text-foreground transition-colors">Share as HTML</a>
      <a href={exportApi.csvUrl(runIds)} className="px-4 py-2 bg-card border border-border rounded-lg font-semibold text-sm hover:bg-[var(--surface-hover)] no-underline text-foreground transition-colors">Export CSV</a>
      <a href={exportApi.jsonUrl(runIds)} className="px-4 py-2 bg-card border border-border rounded-lg font-semibold text-sm hover:bg-[var(--surface-hover)] no-underline text-foreground transition-colors">Export JSON</a>
    </div>
  );
}
