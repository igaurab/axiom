"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTagFilter } from "@/providers/tag-filter-provider";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Filter, Moon, Sun } from "lucide-react";

const links = [
  { href: "/", label: "History" },
  { href: "/datasets", label: "Datasets" },
  { href: "/agents", label: "Agents" },
  { href: "/compare", label: "Compare" },
];

export function Navbar() {
  const pathname = usePathname();
  const { tag, setTag, allTags } = useTagFilter();
  const { theme, toggle } = useTheme();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="bg-card sticky top-0 z-50 h-14 px-8 flex items-center justify-between border-b border-border">
      <div className="flex items-center gap-1">
        <Link href="/" className="text-foreground font-extrabold text-lg mr-8 tracking-wide no-underline">
          BENCHMARK
        </Link>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold text-sm no-underline transition-colors duration-150",
              isActive(l.href)
                ? "text-foreground bg-[var(--surface-hover)]"
                : "text-muted hover:text-foreground hover:bg-[var(--surface-hover)]"
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-light" />
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="bg-card text-foreground border border-border rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors hover:bg-[var(--surface-hover)]"
          >
            <option value="">all</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-[var(--surface-hover)] transition-colors duration-150"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </nav>
  );
}
