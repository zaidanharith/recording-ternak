import { Badge } from "@/components/ui/badge";
import type { RecordingSource, RecordingStatus } from "@/types/recording";

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
