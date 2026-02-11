"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";
import { AccuracyOverview } from "./accuracy-overview";
import { AccuracyByType } from "./accuracy-by-type";
import { PerformanceStats } from "./performance-stats";
import { ToolUsageChart } from "./tool-usage-chart";

interface Props {
  runId: number;
}

export function DashboardView({ runId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", runId],
    queryFn: () => analyticsApi.run(runId),
  });

  if (isLoading || !data) return <div className="text-center py-8 text-muted">Loading analytics...</div>;

  return (
    <>
      <AccuracyOverview gradeCounts={data.grade_counts} />
      <AccuracyByType byType={data.by_type} />
      <PerformanceStats performance={data.performance} />
      <ToolUsageChart toolUsage={data.tool_usage} />
    </>
  );
}
