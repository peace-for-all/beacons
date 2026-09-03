import type { EvidenceAutomationRun } from "./schemas";

type MonitoringRun = {
  catalogReleaseId: string;
  complete: boolean;
};

/**
 * Reports are append-only history. Only a schema-v2 authoritative report for
 * the requested release may be used as current publication evidence.
 */
export function selectLatestActionEligibleAutomationRun(
  runs: readonly EvidenceAutomationRun[],
  catalogReleaseId: string,
) {
  return [...runs]
    .reverse()
    .find(
      (run) =>
        run.schemaVersion === 2 &&
        run.mode === "authoritative_automation" &&
        run.eligibleForActions &&
        run.catalogReleaseId === catalogReleaseId,
    ) ?? null;
}

/** A complete acquisition/display run must describe the same catalog release. */
export function selectLatestCompleteMonitoringRun<T extends MonitoringRun>(
  runs: readonly T[],
  catalogReleaseId: string,
) {
  return [...runs]
    .reverse()
    .find((run) => run.complete && run.catalogReleaseId === catalogReleaseId) ?? null;
}
