import { Badge } from "@/components/ui/Badge";

type DisclosureBadgeProps = {
  label?: string;
};

export function DisclosureBadge({ label = "Real OMB data + synthetic telemetry" }: DisclosureBadgeProps) {
  return <Badge tone="warning">{label}</Badge>;
}
