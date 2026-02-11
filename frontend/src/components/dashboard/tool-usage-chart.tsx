"use client";

interface Props {
  toolUsage: Record<string, number>;
}

export function ToolUsageChart({ toolUsage }: Props) {
  const entries = Object.entries(toolUsage);
  if (!entries.length) return null;

  const maxVal = Math.max(...entries.map(([, v]) => v));
  const sorted = entries.sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-card rounded-xl p-6 px-8 mb-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 pb-2 border-b-2 border-border text-brand-dark">Tool Usage</h2>
      {sorted.map(([name, count]) => {
        const w = Math.max(20, Math.round((count / maxVal) * 300));
        return (
          <div key={name} className="flex items-center gap-2 my-1 text-sm">
            <div className="w-44 text-right font-semibold text-xs shrink-0">{name}</div>
            <div
              className="h-5 rounded bg-brand flex items-center justify-center text-white text-xs font-bold min-w-[20px]"
              style={{ width: `${w}px` }}
            >
              {count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
