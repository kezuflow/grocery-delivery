export type OperationalAlertType =
  | "outbox-dead-lettered"
  | "outbox-backlog"
  | "outbox-stale"
  | "delivery-failures"
  | "procurement-shortages"
  | "packing-exceptions";

export type OperationalAlertSeverity = "warning" | "critical";

export type OperationalAlert = Readonly<{
  id: string;
  type: OperationalAlertType;
  severity: OperationalAlertSeverity;
  cycleId: string;
  message: string;
  observedValue: number;
  threshold: number;
}>;

export type OperationalAlertThresholds = Readonly<{
  pendingOutboxCount: number;
  pendingOutboxAgeSeconds: number;
  deadLetteredOutboxCount: number;
  failedDeliveryCount: number;
  openShortageCount: number;
  exceptionalManifestCount: number;
}>;

export type OperationalProjectionForAlerts = Readonly<{
  cycleId: string;
  generatedAt: string;
  outbox: Readonly<{
    pendingCount: number;
    oldestPendingAt: string | null;
    deadLetteredCount: number;
  }>;
  delivery: Readonly<{ failed: number }>;
  procurement: Readonly<{ openShortages: number; exceptionalManifests: number }>;
}>;

export const defaultOperationalAlertThresholds: OperationalAlertThresholds = {
  pendingOutboxCount: 10,
  pendingOutboxAgeSeconds: 900,
  deadLetteredOutboxCount: 1,
  failedDeliveryCount: 1,
  openShortageCount: 1,
  exceptionalManifestCount: 1,
};

export function createOperationalAlerts(
  projection: OperationalProjectionForAlerts,
  configuredThresholds: Partial<OperationalAlertThresholds> = {},
): readonly OperationalAlert[] {
  const thresholds: OperationalAlertThresholds = {
    pendingOutboxCount:
      configuredThresholds.pendingOutboxCount ??
      defaultOperationalAlertThresholds.pendingOutboxCount,
    pendingOutboxAgeSeconds:
      configuredThresholds.pendingOutboxAgeSeconds ??
      defaultOperationalAlertThresholds.pendingOutboxAgeSeconds,
    deadLetteredOutboxCount:
      configuredThresholds.deadLetteredOutboxCount ??
      defaultOperationalAlertThresholds.deadLetteredOutboxCount,
    failedDeliveryCount:
      configuredThresholds.failedDeliveryCount ??
      defaultOperationalAlertThresholds.failedDeliveryCount,
    openShortageCount:
      configuredThresholds.openShortageCount ?? defaultOperationalAlertThresholds.openShortageCount,
    exceptionalManifestCount:
      configuredThresholds.exceptionalManifestCount ??
      defaultOperationalAlertThresholds.exceptionalManifestCount,
  };
  validateThresholds(thresholds);
  const alerts: OperationalAlert[] = [];
  const add = (
    type: OperationalAlertType,
    severity: OperationalAlertSeverity,
    observedValue: number,
    threshold: number,
    message: string,
  ) => {
    if (observedValue < threshold) return;
    alerts.push({
      id: `${projection.cycleId}:${type}`,
      type,
      severity,
      cycleId: projection.cycleId,
      message,
      observedValue,
      threshold,
    });
  };

  add(
    "outbox-dead-lettered",
    "critical",
    projection.outbox.deadLetteredCount,
    thresholds.deadLetteredOutboxCount,
    `${projection.outbox.deadLetteredCount} outbox event(s) are dead-lettered.`,
  );
  add(
    "outbox-backlog",
    "warning",
    projection.outbox.pendingCount,
    thresholds.pendingOutboxCount,
    `${projection.outbox.pendingCount} outbox event(s) are waiting to be delivered.`,
  );

  if (projection.outbox.oldestPendingAt) {
    const generatedAt = Date.parse(projection.generatedAt);
    const oldestPendingAt = Date.parse(projection.outbox.oldestPendingAt);
    if (Number.isFinite(generatedAt) && Number.isFinite(oldestPendingAt)) {
      const ageSeconds = Math.max(0, Math.floor((generatedAt - oldestPendingAt) / 1000));
      add(
        "outbox-stale",
        "warning",
        ageSeconds,
        thresholds.pendingOutboxAgeSeconds,
        `The oldest pending outbox event is ${ageSeconds} second(s) old.`,
      );
    }
  }

  add(
    "delivery-failures",
    "critical",
    projection.delivery.failed,
    thresholds.failedDeliveryCount,
    `${projection.delivery.failed} delivery assignment(s) have failed.`,
  );
  add(
    "procurement-shortages",
    "warning",
    projection.procurement.openShortages,
    thresholds.openShortageCount,
    `${projection.procurement.openShortages} procurement shortage(s) remain open.`,
  );
  add(
    "packing-exceptions",
    "critical",
    projection.procurement.exceptionalManifests,
    thresholds.exceptionalManifestCount,
    `${projection.procurement.exceptionalManifests} packing manifest(s) need attention.`,
  );
  return alerts;
}

function validateThresholds(thresholds: OperationalAlertThresholds): void {
  for (const value of Object.values(thresholds)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error("operational alert thresholds must be positive integers");
    }
  }
}
