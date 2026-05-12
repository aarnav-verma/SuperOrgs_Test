import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: "default" | "panel" | "dark";
};

const toneClasses = {
  default: "border-[var(--border)] bg-white text-[var(--foreground)]",
  panel: "border-[var(--border)] bg-[var(--panel)] text-[var(--foreground)]",
  dark: "border-white/10 bg-[var(--ink)] text-white"
};

export function Card({ children, className, tone = "default", ...props }: CardProps) {
  const classes = ["rounded-lg border", toneClasses[tone], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
