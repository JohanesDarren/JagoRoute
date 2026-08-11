"use client";

export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-outline-variant pb-5 md:flex-row md:items-end">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-on-surface-variant">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
