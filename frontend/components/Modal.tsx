"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className={cn(
          "w-full max-h-[90vh] overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-modal",
          wide ? "max-w-2xl" : "max-w-md"
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
