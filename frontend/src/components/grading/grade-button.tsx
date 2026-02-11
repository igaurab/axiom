"use client";

import { cn } from "@/lib/utils";
import type { GradeValue } from "@/lib/types";

interface Props {
  grade: GradeValue;
  active: boolean;
  onClick: () => void;
}

const config: Record<GradeValue, { label: string; icon: string; base: string; activeClass: string }> = {
  correct: {
    label: "Correct",
    icon: "\u2713",
    base: "bg-grade-correct-bg border-grade-correct-border text-grade-correct-text hover:bg-green-200",
    activeClass: "font-black scale-105 shadow-[0_2px_8px_rgba(40,167,69,0.4)]",
  },
  partial: {
    label: "Partial",
    icon: "~",
    base: "bg-grade-partial-bg border-grade-partial-border text-grade-partial-text hover:bg-yellow-200",
    activeClass: "font-black scale-105 shadow-[0_2px_8px_rgba(255,193,7,0.4)]",
  },
  wrong: {
    label: "Wrong",
    icon: "\u2717",
    base: "bg-grade-wrong-bg border-grade-wrong-border text-grade-wrong-text hover:bg-red-200",
    activeClass: "font-black scale-105 shadow-[0_2px_8px_rgba(220,53,69,0.4)]",
  },
};

export function GradeButton({ grade, active, onClick }: Props) {
  const c = config[grade];
  return (
    <button
      className={cn(
        "px-3 py-1.5 border-2 rounded-md cursor-pointer font-bold transition-all text-sm",
        c.base,
        active && c.activeClass
      )}
      onClick={onClick}
    >
      {c.icon} {c.label}
    </button>
  );
}
