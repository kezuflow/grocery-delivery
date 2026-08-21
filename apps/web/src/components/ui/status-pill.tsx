import { Badge, type BadgeTone } from "./badge";

const statusTones: Record<string, BadgeTone> = {
  active: "success",
  approved: "success",
  delivered: "success",
  ready: "success",
  pending: "warning",
  packed: "warning",
  assigned: "accent",
  cancelled: "danger",
  failed: "danger",
};

export function getStatusTone(status: string): BadgeTone {
  return statusTones[status.trim().toLowerCase()] ?? "neutral";
}

export function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function StatusPill({ status }: Readonly<{ status: string }>) {
  return <Badge tone={getStatusTone(status)}>{formatStatus(status)}</Badge>;
}
