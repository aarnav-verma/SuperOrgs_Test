import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type BiComponentFrameProps = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  syntheticMetric?: boolean;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function BiComponentFrame({
  title,
  subtitle,
  eyebrow,
  syntheticMetric,
  loading,
  error,
  empty,
  emptyMessage = "No data available for this view.",
  children,
  actions,
  className
}: BiComponentFrameProps) {
  const classes = ["overflow-hidden", className].filter(Boolean).join(" ");

  return (
    <Card className={classes}>
      {(title || subtitle || eyebrow || syntheticMetric || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {eyebrow && <Badge>{eyebrow}</Badge>}
              {syntheticMetric && <Badge tone="warning">Synthetic estimate</Badge>}
            </div>
            {title && (
              <h3 className="mt-2 truncate text-sm font-semibold text-[var(--foreground)]">
                {title}
              </h3>
            )}
            {subtitle && <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-6 w-4/5" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-[var(--warning-border)] bg-[var(--warning-soft)] px-3 py-2 text-xs leading-5 text-[var(--warning)]">
            {error}
          </div>
        ) : empty ? (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--panel)] px-3 py-6 text-center text-xs text-[var(--muted)]">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
