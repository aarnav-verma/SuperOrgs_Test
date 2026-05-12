import type { HTMLAttributes, ReactNode } from "react";

type BadgeTone = "neutral" | "strong" | "success" | "warning" | "dark";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-[var(--border)] bg-white text-[var(--muted)]",
  strong: "border-[var(--border-strong)] bg-[var(--foreground)] text-white",
  success: "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]",
  warning: "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]",
  dark: "border-white/10 bg-white/[0.08] text-white/75"
};

export function Badge({ children, className, tone = "neutral", ...props }: BadgeProps) {
  const classes = [
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
    toneClasses[tone],
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
