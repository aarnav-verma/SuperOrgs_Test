import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "subtle";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-[var(--ink)] bg-[var(--ink)] text-white hover:bg-[var(--foreground)]",
  secondary: "border-[var(--border-strong)] bg-white text-[var(--foreground)] hover:bg-[var(--panel)]",
  ghost: "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--foreground)]",
  subtle: "border-[var(--border)] bg-[var(--soft)] text-[var(--foreground)] hover:bg-[var(--soft-strong)]"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm"
};

export function Button({
  children,
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
    "disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
