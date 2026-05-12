import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type = "text", ...props }: InputProps) {
  const classes = [
    "h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] shadow-sm",
    "placeholder:text-[var(--muted)]",
    "focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]",
    "disabled:cursor-not-allowed disabled:bg-[var(--soft)] disabled:text-[var(--muted)]",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return <input className={classes} type={type} {...props} />;
}
