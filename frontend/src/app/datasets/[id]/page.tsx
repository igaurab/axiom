"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { suitesApi } from "@/lib/api/suites";
import { PageHeader } from "@/components/layout/page-header";
import { TagBadge } from "@/components/ui/tag-badge";
import { X } from "lucide-react";

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const suiteId = parseInt(id);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [importMsg, setImportMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [qType, setQType] = useState("");
  const [qText, setQText] = useState("");
  const [qAnswer, setQAnswer] = useState("");
  const [qComments, setQComments] = useState("");

  const { data: suite, isLoading } = useQuery({
    queryKey: ["suite", suiteId],
    queryFn: () => suitesApi.get(suiteId),
  });

  const importCsvMutation = useMutation({
    mutationFn: (file: File) => suitesApi.importCsv(suiteId, file),
    onSuccess: (data) => {
      setImportMsg(`Imported ${data.imported} queries`);
      queryClient.invalidateQueries({ queryKey: ["suite", suiteId] });
    },
    onError: (err: Error) => setImportMsg(err.message),
  });

  const addQueryMutation = useMutation({
    mutationFn: () =>
      suitesApi.addQuery(suiteId, {
        tag: qType || null,
        query_text: qText,
        expected_answer: qAnswer,
        comments: qComments || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suite", suiteId] });
      setAddModal(false);
      setQType("");
      setQText("");
      setQAnswer("");
      setQComments("");
    },
  });

  const handleCsvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (file) importCsvMutation.mutate(file);
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm outline-none transition-all bg-card border border-border text-foreground placeholder:text-muted-light focus:ring-2 focus:ring-ring/30 focus:border-ring/50";

  if (isLoading || !suite) return <div className="text-center py-8 text-muted">Loading...</div>;

  return (
    <>
      <PageHeader title={suite.name} backHref="/datasets">
        <div className="flex gap-1">
          {(suite.tags || []).map((t) => (
            <TagBadge key={t} tag={t} />
          ))}
        </div>
      </PageHeader>

      {/* CSV Import */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-4">
        <h2 className="text-lg font-semibold mb-2 text-foreground">Import Queries from CSV</h2>
        <p className="text-muted text-xs mb-3">Format: id, tag, query, answer, comments</p>
        <form onSubmit={handleCsvSubmit} className="flex gap-3 items-center">
          <input type="file" ref={fileRef} accept=".csv" className="hidden" id="csv-upload" onChange={() => setFileName(fileRef.current?.files?.[0]?.name || "")} />
          <label htmlFor="csv-upload" className="px-4 py-2 bg-card border border-border text-foreground rounded-lg font-semibold text-sm hover:bg-[var(--surface-hover)] transition-all cursor-pointer shrink-0">
            {fileName || "Choose File"}
          </label>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:brightness-110 hover:-translate-y-px transition-all shrink-0">Upload</button>
        </form>
        {importMsg && <div className={`text-sm mt-2 ${importMsg.startsWith("Imported") ? "text-success" : "text-destructive"}`}>{importMsg}</div>}
      </div>

      {/* Queries table */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-foreground">Queries ({suite.queries?.length || 0})</h2>
          <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:brightness-110 hover:-translate-y-px transition-all" onClick={() => setAddModal(true)}>+ Add Query</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 bg-[var(--surface-hover)] font-medium text-xs text-muted uppercase">#</th>
                <th className="text-left p-2 bg-[var(--surface-hover)] font-medium text-xs text-muted uppercase">Tag</th>
                <th className="text-left p-2 bg-[var(--surface-hover)] font-medium text-xs text-muted uppercase">Query</th>
                <th className="text-left p-2 bg-[var(--surface-hover)] font-medium text-xs text-muted uppercase">Expected Answer</th>
                <th className="text-left p-2 bg-[var(--surface-hover)] font-medium text-xs text-muted uppercase">Comments</th>
              </tr>
            </thead>
            <tbody>
              {(suite.queries || []).map((q) => (
                <tr key={q.id} className="border-b border-border last:border-b-0">
                  <td className="p-2 text-foreground">{q.ordinal}</td>
                  <td className="p-2">{q.tag && <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--tag-purple-bg)', color: 'var(--tag-purple-text)' }}>{q.tag}</span>}</td>
                  <td className="p-2 max-w-xs truncate text-foreground" title={q.query_text}>{q.query_text.substring(0, 100)}{q.query_text.length > 100 ? "..." : ""}</td>
                  <td className="p-2 max-w-xs truncate text-foreground" title={q.expected_answer}>{q.expected_answer.substring(0, 80)}{q.expected_answer.length > 80 ? "..." : ""}</td>
                  <td className="p-2 text-muted">{q.comments || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Query Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center modal-backdrop" onClick={(e) => e.target === e.currentTarget && setAddModal(false)}>
          <div className="bg-card border border-border rounded-2xl w-[90%] max-w-[500px] p-6 shadow-2xl modal-content">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-foreground">Add Query</h3>
              <button className="p-1.5 rounded-lg text-muted-light hover:text-foreground hover:bg-[var(--surface-hover)] transition-colors" onClick={() => setAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addQueryMutation.mutate(); }}>
              <div className="mb-4">
                <label className="block font-medium text-sm text-muted mb-1.5">Tag</label>
                <input className={inputCls} value={qType} onChange={(e) => setQType(e.target.value)} placeholder="e.g. archive_driven" />
              </div>
              <div className="mb-4">
                <label className="block font-medium text-sm text-muted mb-1.5">Query Text</label>
                <textarea className={`${inputCls} resize-y`} rows={3} value={qText} onChange={(e) => setQText(e.target.value)} required />
              </div>
              <div className="mb-4">
                <label className="block font-medium text-sm text-muted mb-1.5">Expected Answer</label>
                <textarea className={`${inputCls} resize-y`} rows={3} value={qAnswer} onChange={(e) => setQAnswer(e.target.value)} required />
              </div>
              <div className="mb-4">
                <label className="block font-medium text-sm text-muted mb-1.5">Comments</label>
                <input className={inputCls} value={qComments} onChange={(e) => setQComments(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="px-4 py-2 rounded-xl font-medium text-sm bg-card border border-border text-foreground hover:bg-[var(--surface-hover)] transition-colors" onClick={() => setAddModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium text-sm shadow-lg shadow-primary/25 hover:brightness-110 hover:-translate-y-px transition-all disabled:opacity-50" disabled={addQueryMutation.isPending}>
                  {addQueryMutation.isPending ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
