import { Badge } from "@/components/ui/badge";
import type {
  GoatCondition,
  RecordingSource,
  RecordingStatus,
  SoldStatus,
} from "@/types/recording";

export function RecordingStatusBadge({ status }: { status: RecordingStatus }) {
  return (
    <Badge variant={status === "PERLU_REVIEW" ? "destructive" : "secondary"}>
      {status === "PERLU_REVIEW" ? "Perlu Review" : "Final"}
    </Badge>
  );
}

export function RecordingSourceBadge({ source }: { source: RecordingSource }) {
  return (
    <Badge variant="outline">{source === "WA" ? "WhatsApp" : "Manual"}</Badge>
  );
}

export function RecordingConditionBadge({
  condition,
}: {
  condition: GoatCondition | null;
}) {
  if (!condition) return <span className="text-muted-foreground">-</span>;
  return (
    <Badge variant={condition === "SAKIT" ? "destructive" : "secondary"}>
      {condition === "SAKIT" ? "Sakit" : "Sehat"}
    </Badge>
  );
}

export function RecordingSoldBadge({ sold }: { sold: SoldStatus | null }) {
  if (!sold) return <span className="text-muted-foreground">-</span>;
  return (
    <Badge variant={sold === "YA" ? "secondary" : "outline"}>
      {sold === "YA" ? "Ya" : "Tidak"}
    </Badge>
  );
}
