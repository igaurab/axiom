"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { runsApi } from "@/lib/api/runs";
import type { RunConfig } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  runIds: number[];
}

function ConfigSection({ config }: { config: RunConfig }) {
  const { run, agent, suite, groupSize } = config;

  const toolsList: string[] = [];
  if (agent?.tools_config) {
    const tc = agent.tools_config;
    if (Array.isArray(tc)) {
      tc.forEach((item: Record<string, unknown>) => {
        if (item.type === "web_search") toolsList.push("web_search");
        else if (Array.isArray(item.allowed_tools)) toolsList.push(...(item.allowed_tools as string[]));
        else if (item.name) toolsList.push(item.name as string);
      });
    } else if (tc.allowed_tools && Array.isArray(tc.allowed_tools)) {
      toolsList.push(...(tc.allowed_tools as string[]));
    }
  }

  return (
    <div className="space-y-4">
      {/* Run */}
      <div className="bg-card rounded-lg p-5 border border-border">
        <h3 className="font-bold text-brand-dark mb-3 pb-1.5 border-b-2 border-border">Run</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-6 gap-y-2">
          <ConfigItem label="Label" value={run.label} />
          <ConfigItem label="Status" value={run.status} />
          <ConfigItem label="Queries" value={`${run.progress_total} (dataset has ${suite?.query_count || "?"})`} />
          {groupSize > 1 && <ConfigItem label="Runs in group" value={`${groupSize} (run #${run.run_number || 1})`} />}
          <ConfigItem label="Batch size" value={String(run.batch_size)} />
          <ConfigItem label="Duration" value={formatDuration(run.started_at, run.completed_at)} />
          <ConfigItem label="Started" value={formatDateTime(run.started_at)} />
          <ConfigItem label="Completed" value={formatDateTime(run.completed_at)} />
          {run.output_dir && <ConfigItem label="Output dir" value={run.output_dir} wide mono />}
        </div>
      </div>

      {/* Dataset */}
      <div className="bg-card rounded-lg p-5 border border-border">
        <h3 className="font-bold text-brand-dark mb-3 pb-1.5 border-b-2 border-border">Dataset</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-6 gap-y-2">
          <ConfigItem label="Name" value={suite?.name || "—"} />
          <ConfigItem label="Total queries" value={String(suite?.query_count || "—")} />
          {suite?.description && <ConfigItem label="Description" value={suite.description} wide />}
        </div>
      </div>

      {/* Agent */}
      <div className="bg-card rounded-lg p-5 border border-border">
        <h3 className="font-bold text-brand-dark mb-3 pb-1.5 border-b-2 border-border">Agent</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-6 gap-y-2">
          <ConfigItem label="Name" value={agent?.name || "—"} />
          <ConfigItem label="Model" value={agent?.model || "—"} mono />
          <ConfigItem label="Executor" value={agent?.executor_type || "—"} />
          {toolsList.length > 0 && (
            <div className="col-span-full flex flex-col py-1">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider mb-0.5">Tools ({toolsList.length})</span>
              <div className="flex flex-wrap gap-1">
                {toolsList.map((t, i) => (
                  <span key={i} className="inline-block bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)] text-xs px-2 py-0.5 rounded font-mono">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {agent?.system_prompt && (
          <div className="mt-3">
            <h4 className="text-sm font-semibold text-muted mb-1.5">System Prompt</h4>
            <pre className="bg-[var(--surface)] border border-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto leading-relaxed">{agent.system_prompt}</pre>
          </div>
        )}

        {agent?.model_settings && Object.keys(agent.model_settings).length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-semibold text-muted mb-1.5">Model Settings</h4>
            <pre className="bg-[var(--surface)] border border-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto leading-relaxed">{JSON.stringify(agent.model_settings, null, 2)}</pre>
          </div>
        )}

        {agent?.tools_config && (
          <div className="mt-3">
            <h4 className="text-sm font-semibold text-muted mb-1.5">Tools Config</h4>
            <pre className="bg-[var(--surface)] border border-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto leading-relaxed">{JSON.stringify(agent.tools_config, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigItem({ label, value, wide, mono }: { label: string; value: string; wide?: boolean; mono?: boolean }) {
  return (
    <div className={`flex flex-col py-1 ${wide ? "col-span-full" : ""}`}>
      <span className="text-xs font-semibold text-muted uppercase tracking-wider mb-0.5">{label}</span>
      <span className={`text-sm text-foreground break-words ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export function ConfigView({ runIds }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["configs", runIds.join(",")],
    queryFn: () => Promise.all(runIds.map((id) => runsApi.getConfig(id))),
  });

  if (isLoading || !data) return <div className="text-center py-8 text-muted">Loading config...</div>;

  // Single run — no tabs needed
  if (data.length <= 1) {
    return <ConfigSection config={data[0]} />;
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex bg-[var(--surface-hover)] border-b-2 border-border rounded-t-lg overflow-x-auto mb-4">
        {data.map((cfg, idx) => (
          <button
            key={idx}
            className={cn(
              "px-5 py-2.5 font-semibold text-sm border-b-[3px] -mb-[2px] whitespace-nowrap transition-colors",
              idx === activeTab
                ? "text-foreground bg-card border-b-brand"
                : "text-muted border-transparent hover:bg-[var(--surface)] hover:text-foreground"
            )}
            onClick={() => setActiveTab(idx)}
          >
            {cfg.run?.label || `Run ${idx + 1}`}
          </button>
        ))}
      </div>

      <ConfigSection config={data[activeTab]} />
    </div>
  );
}
