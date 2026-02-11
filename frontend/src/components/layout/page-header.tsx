import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  backHref?: string;
  backLabel?: string;
  children?: ReactNode; // actions slot
  subtitle?: ReactNode;
}

export function PageHeader({ title, backHref, backLabel, children, subtitle }: Props) {
  return (
    <div className="flex justify-between items-start pb-6 mb-6 border-b border-border">
      <div>
        {backHref && (
          <a href={backHref} className="inline-flex items-center gap-1.5 text-brand text-sm no-underline mb-1 hover:opacity-80 transition-opacity">
            <ArrowLeft size={14} />
            {backLabel || "Back"}
          </a>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
