"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ResultOut } from "@/lib/types";

interface QueryNavItem {
  queryId: number;
  ordinal: number;
  gradedCount: number;
  totalRuns: number;
}

interface Props {
  items: QueryNavItem[];
  activeQueryId: number | null;
  onNavigate: (queryId: number) => void;
}

export function QueryNav({ items, activeQueryId, onNavigate }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll the sidebar to keep active item visible
  useEffect(() => {
    if (!activeRef.current || !listRef.current) return;
    const list = listRef.current;
    const item = activeRef.current;
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < listRect.top || itemRect.bottom > listRect.bottom) {
      item.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeQueryId]);

  if (items.length === 0) return null;

  return (
    <div className="fixed left-3 top-1/2 -translate-y-1/2 z-30 hidden xl:block">
      <div className="glass rounded-2xl py-2 px-1.5 shadow-lg max-h-[70vh] flex flex-col w-[54px]">
        {/* Header */}
        <div className="text-[9px] font-bold text-muted-light uppercase tracking-widest text-center py-1 mb-1 border-b border-border/50 shrink-0">
          Q
        </div>

        {/* Scrollable list */}
        <div ref={listRef} className="overflow-y-auto overflow-x-hidden flex-1 scrollbar-hidden">
          {items.map((item) => {
            const isActive = item.queryId === activeQueryId;
            const allDone = item.gradedCount === item.totalRuns;
            const someDone = item.gradedCount > 0;

            return (
              <button
                key={item.queryId}
                ref={isActive ? activeRef : undefined}
                onClick={() => onNavigate(item.queryId)}
                className={cn(
                  "w-full flex items-center justify-center gap-1 py-1 px-1 rounded-lg font-medium transition-all duration-150 cursor-pointer",
                  "text-[12px] hover:text-[14px] hover:text-primary hover:font-bold",
                  isActive
                    ? "bg-primary/15 text-primary font-bold text-[13px]"
                    : allDone
                      ? "text-brand-dark"
                      : "text-muted"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0 transition-colors",
                    allDone ? "bg-brand-dark" : someDone ? "bg-yellow-400" : "bg-muted-light"
                  )}
                />
                <span className="tabular-nums">
                  {item.ordinal}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper to build nav items from compare data
export function buildQueryNavItems(
  queryIds: number[],
  allResults: Record<number, Record<number, ResultOut>>,
  runIds: number[]
): QueryNavItem[] {
  return queryIds.map((qid) => {
    const qResults = allResults[qid] || {};
    const firstResult = Object.values(qResults)[0];
    const ordinal = firstResult?.query?.ordinal || qid;
    let gradedCount = 0;
    runIds.forEach((rid) => {
      if (qResults[rid]?.grade?.grade) gradedCount++;
    });
    return {
      queryId: qid,
      ordinal,
      gradedCount,
      totalRuns: runIds.length,
    };
  });
}

// Helper to build nav items from single-run results
export function buildSingleRunNavItems(resultsList: ResultOut[]): QueryNavItem[] {
  return resultsList
    .slice()
    .sort((a, b) => a.query_id - b.query_id)
    .map((r) => ({
      queryId: r.query_id,
      ordinal: r.query?.ordinal || r.query_id,
      gradedCount: r.grade?.grade ? 1 : 0,
      totalRuns: 1,
    }));
}
