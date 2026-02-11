"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { suitesApi } from "@/lib/api/suites";
import { agentsApi } from "@/lib/api/agents";
import { runsApi } from "@/lib/api/runs";
import { PageHeader } from "@/components/layout/page-header";
import type { QueryOut, RunCreate } from "@/lib/types";

type PickMode = "top" | "bottom" | "random";

export default function NewRunPage() {
  const router = useRouter();

  const [suiteId, setSuiteId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [label, setLabel] = useState("");
  const [tags, setTags] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [batchSize, setBatchSize] = useState("10");
  const [repeat, setRepeat] = useState("1");
  const [queryMode, setQueryMode] = useState<"all" | "select">("all");
  const [queries, setQueries] = useState<QueryOut[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pickN, setPickN] = useState("");
  const [pickMode, setPickMode] = useState<PickMode>("top");
  const pickDebounce = useRef<ReturnType<typeof setTimeout>>(null);

  const { data: suites = [] } = useQuery({ queryKey: ["suites-list"], queryFn: () => suitesApi.list() });
  const { data: agents = [] } = useQuery({ queryKey: ["agents-list"], queryFn: () => agentsApi.list() });

  // Load queries when suite changes
  useEffect(() => {
    if (!suiteId) { setQueries([]); return; }
    suitesApi.get(parseInt(suiteId)).then((s) => {
      setQueries(s.queries || []);
      setSelectedIds(new Set((s.queries || []).map((q) => q.id)));
    });
  }, [suiteId]);

  const selectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(queries.map((q) => q.id)) : new Set());
    setPickN("");
  }, [queries]);

  const applyPick = useCallback((mode: PickMode, n: number) => {
    if (!n || n < 1) return;
    const count = Math.min(n, queries.length);
    if (mode === "top") {
      setSelectedIds(new Set(queries.slice(0, count).map((q) => q.id)));
    } else if (mode === "bottom") {
      setSelectedIds(new Set(queries.slice(-count).map((q) => q.id)));
    } else {
      const indices = new Set<number>();
      while (indices.size < count) indices.add(Math.floor(Math.random() * queries.length));
      setSelectedIds(new Set([...indices].map((i) => queries[i].id)));
    }
  }, [queries]);

  const handlePickN = useCallback((val: string) => {
    setPickN(val);
    if (pickDebounce.current) clearTimeout(pickDebounce.current);
    pickDebounce.current = setTimeout(() => {
      const n = parseInt(val);
      if (n > 0) applyPick(pickMode, n);
    }, 200);
  }, [pickMode, applyPick]);

  const handlePickMode = useCallback((mode: PickMode) => {
    setPickMode(mode);
    const n = parseInt(pickN);
    if (n > 0) applyPick(mode, n);
  }, [pickN, applyPick]);

  const toggleQuery = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const createMutation = useMutation({
    mutationFn: () => {
      const body: RunCreate = {
        suite_id: parseInt(suiteId),
        agent_config_id: parseInt(agentId),
        label,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        batch_size: parseInt(batchSize),
        repeat: parseInt(repeat) || 1,
      };
      if (outputDir.trim()) body.output_dir = outputDir.trim();
      if (queryMode === "select") body.query_ids = [...selectedIds];
      return runsApi.create(body);
    },
    onSuccess: (runs) => {
      router.push(`/runs/${runs[0].id}`);
    },
    onError: (err: Error) => {
      alert(err.message || "Error creating run");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryMode === "select" && selectedIds.size === 0) {
      alert("Select at least one query");
      return;
    }
    createMutation.mutate();
  };

  return (
    <>
      <PageHeader title="Start New Benchmark Run" backHref="/" />

      <div className="bg-white rounded-xl p-6 shadow-sm max-w-3xl">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block font-semibold text-sm text-gray-600 mb-1">Dataset</label>
            <select className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-brand outline-none" value={suiteId} onChange={(e) => setSuiteId(e.target.value)} required>
              <option value="">Select a dataset...</option>
              {suites.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.query_count} queries)</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="block font-semibold text-sm text-gray-600 mb-1">Agent</label>
            <select className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-brand outline-none" value={agentId} onChange={(e) => setAgentId(e.target.value)} required>
              <option value="">Select an agent...</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.model})</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="block font-semibold text-sm text-gray-600 mb-1">Label</label>
            <input className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-brand outline-none" value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="e.g. NC Run 3" />
          </div>

          <div className="mb-4">
            <label className="block font-semibold text-sm text-gray-600 mb-1">Tags (comma-separated)</label>
            <input className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-brand outline-none" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. astro-team, v1" />
          </div>

          <div className="mb-4">
            <label className="block font-semibold text-sm text-gray-600 mb-1">Output Directory</label>
            <input className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-brand outline-none" value={outputDir} onChange={(e) => setOutputDir(e.target.value)} placeholder="~/benchmark_app_data/<label>" />
            <span className="text-xs text-gray-500">Leave blank for default: ~/benchmark_app_data/&lt;label&gt;</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-semibold text-sm text-gray-600 mb-1">Batch Size</label>
              <select className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-brand outline-none" value={batchSize} onChange={(e) => setBatchSize(e.target.value)}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-sm text-gray-600 mb-1">Repeat</label>
              <input type="number" className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-brand outline-none" value={repeat} onChange={(e) => setRepeat(e.target.value)} min={1} max={10} />
              <span className="text-xs text-gray-500">Run the benchmark N times (max 3 in parallel)</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block font-semibold text-sm text-gray-600 mb-2">Queries</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="queryMode" checked={queryMode === "all"} onChange={() => setQueryMode("all")} /> All
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="queryMode" checked={queryMode === "select"} onChange={() => setQueryMode("select")} /> Select specific
              </label>
            </div>

            {queryMode === "select" && (
              <div className="mt-3">
                <div className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <button type="button" className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-semibold hover:bg-gray-100" onClick={() => selectAll(true)}>Select All</button>
                  <button type="button" className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-semibold hover:bg-gray-100" onClick={() => selectAll(false)}>Deselect All</button>
                  <span className="w-px h-6 bg-gray-300" />
                  <span className="text-xs font-semibold text-gray-600">Pick</span>
                  <input type="number" className="w-16 px-2 py-1.5 border border-gray-300 rounded-md text-xs text-center" value={pickN} onChange={(e) => handlePickN(e.target.value)} min={1} placeholder="N" />
                  <div className="flex border border-gray-300 rounded-md overflow-hidden">
                    {(["top", "bottom", "random"] as PickMode[]).map((m) => (
                      <button key={m} type="button" className={`px-3 py-1.5 text-xs font-semibold ${pickMode === m ? "bg-brand text-white" : "bg-white hover:bg-gray-100"}`} onClick={() => handlePickMode(m)}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                  <span className="ml-auto text-xs text-gray-500">{selectedIds.size} of {queries.length} selected</span>
                </div>

                <div className="grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                  {queries.map((q) => (
                    <label key={q.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-white cursor-pointer">
                      <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggleQuery(q.id)} />
                      <span className="font-semibold text-gray-500 shrink-0">Q{q.ordinal}:</span>
                      <span className="truncate">{q.query_text}</span>
                    </label>
                  ))}
                  {queries.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">Select a dataset first</div>}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <a href="/" className="px-4 py-2 bg-gray-100 rounded-lg font-semibold text-sm hover:bg-gray-200 no-underline text-gray-600">Cancel</a>
            <button type="submit" className="px-4 py-2 bg-brand text-white rounded-lg font-semibold text-sm hover:bg-brand-hover disabled:opacity-50" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Starting..." : "Start Run"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
