import { Badge } from "@/components/ui/Badge";

type DatasetDisclosureBadgeProps = {
  synthetic?: boolean;
  label?: string;
};

export function DatasetDisclosureBadge({
  synthetic = true,
  label
}: DatasetDisclosureBadgeProps) {
  return (
    <Badge tone={synthetic ? "warning" : "neutral"}>
      {label ?? (synthetic ? "Synthetic estimate" : "Real OMB inventory")}
    </Badge>
  );
}
