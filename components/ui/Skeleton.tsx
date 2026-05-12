import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  const classes = ["animate-pulse rounded-md bg-[var(--skeleton)]", className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes} {...props} />;
}
