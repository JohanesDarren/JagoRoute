"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "emerald",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  accent?: "emerald" | "indigo" | "amber" | "sky";
}) {
  // Entity accent system -> precision connectivity palette
  const accents = {
    emerald: "bg-primary-container/20 text-primary",
    indigo: "bg-secondary-container/20 text-secondary",
    amber: "bg-tertiary-container/20 text-tertiary",
    sky: "bg-surface-container-high text-on-surface",
  };

  return (
    <div className="relative flex h-32 flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card transition-colors duration-150 hover:border-primary">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
        {label}
      </div>
      <div className="text-4xl font-bold tracking-tight text-on-surface">{value}</div>
      <div className={cn("absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full", accents[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      {hint && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}
