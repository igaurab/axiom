import { CheckCircle2, Loader2, XCircle, Ban, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "text-success", label: "Completed" },
  running:   { icon: Loader2,      color: "text-primary",  label: "Running" },
  failed:    { icon: XCircle,      color: "text-destructive", label: "Failed" },
  cancelled: { icon: Ban,          color: "text-warning",  label: "Cancelled" },
  pending:   { icon: Clock,        color: "text-muted-light", label: "Pending" },
};

interface StatusBadgeProps {
  status: string;
  elapsed?: string;
  className?: string;
}

export function StatusBadge({ status, elapsed, className }: StatusBadgeProps) {
  const cfg = statusConfig[status] || statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", className)}>
      <Icon size={15} className={cn(cfg.color, status === "running" && "animate-spin-slow")} />
      <span className={cfg.color}>{cfg.label}</span>
      {elapsed && <span className="text-muted-light text-xs ml-0.5">{elapsed}</span>}
    </span>
  );
}
