"use client";

import type { GradeCountsOut } from "@/lib/types";

interface Props {
  gradeCounts: GradeCountsOut;
}

export function AccuracyOverview({ gradeCounts: gc }: Props) {
  return (
    <div className="bg-card rounded-xl p-6 px-8 mb-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 pb-2 border-b-2 border-border text-brand-dark">Accuracy Overview</h2>
      <div className="flex gap-8 flex-wrap text-lg">
        <span className="text-grade-correct-text font-bold">Correct: {gc.correct}</span>
        <span className="text-grade-partial-text font-bold">Partial: {gc.partial}</span>
        <span className="text-grade-wrong-text font-bold">Wrong: {gc.wrong}</span>
        <span>Accuracy: {gc.accuracy.toFixed(1)}%</span>
        <span>Weighted Score: {gc.weighted_score.toFixed(1)}%</span>
      </div>
    </div>
  );
}
