import { fingerprint } from "./evidence-automation-core.mjs";
import { sha256 } from "./evidence-monitor-core.mjs";

function fail(message) {
  throw new Error(message);
}

function unique(records, label) {
  const seen = new Set();
  for (const record of records) {
    if (seen.has(record.id)) fail(`Duplicate ${label} ID: ${record.id}`);
    seen.add(record.id);
  }
}

function sameArray(left, right) {
  return left.length === right.length && left.every(
    (item, index) => item.extract === right[index].extract && item.extractSha256 === right[index].extractSha256,
  );
}

/**
 * Validates immutable evidence history using only the records that existed in
 * that history. It intentionally does not compare old releases with today's
 * catalog cardinality: release manifests were not recorded for those runs.
 */
export function validateEvidenceLogHistory({ monitoringReports, evidenceDecisions }) {
  unique(monitoringReports.runs, "monitoring run");
  unique(evidenceDecisions.runs, "automation run");

  const monitoringById = new Map();
  const observationById = new Map();
  for (const run of monitoringReports.runs) {
    if (monitoringById.has(run.id)) fail(`Duplicate monitoring run ID: ${run.id}`);
    monitoringById.set(run.id, run);
    unique(run.observations, `observation in ${run.id}`);
    for (const observation of run.observations) {
      if (observationById.has(observation.id)) fail(`Duplicate observation ID: ${observation.id}`);
      observationById.set(observation.id, { run, observation });
    }
  }

  let previousHash = null;
  for (const run of evidenceDecisions.runs) {
    if (run.previousRunSha256 !== previousHash) {
      fail(`Automation run ${run.id} breaks the append-only hash chain`);
    }
    const { reportSha256, ...withoutHash } = run;
    if (fingerprint(withoutHash) !== reportSha256) fail(`Automation run ${run.id} has an invalid report hash`);
    previousHash = reportSha256;

    const monitor = monitoringById.get(run.monitoringRunId);
    if (!monitor) fail(`Automation run ${run.id} cites an unknown monitoring run`);
    if (monitor.catalogReleaseId !== run.catalogReleaseId) {
      fail(`Automation run ${run.id} and monitor ${monitor.id} target different releases`);
    }

    unique(run.decisions, `decision in ${run.id}`);
    const decidedClaims = new Set();
    for (const decision of run.decisions) {
      if (decidedClaims.has(decision.claimId)) fail(`Automation run ${run.id} has duplicate decision claim: ${decision.claimId}`);
      decidedClaims.add(decision.claimId);
      for (const observationId of decision.observationIds) {
        const linked = observationById.get(observationId);
        if (!linked || linked.run.id !== monitor.id) {
          fail(`Decision ${decision.id} references an observation outside monitor ${monitor.id}`);
        }
      }
    }

    const packets = run.proofPackets ?? [];
    unique(packets, `proof packet in ${run.id}`);
    const packetById = new Map(packets.map((packet) => [packet.id, packet]));
    const packetReferences = new Map();
    for (const decision of run.decisions) {
      for (const packetId of decision.proofPacketIds ?? []) {
        const packet = packetById.get(packetId);
        if (!packet) fail(`Decision ${decision.id} references an unknown proof packet: ${packetId}`);
        if (packet.claimId !== decision.claimId) fail(`Proof packet ${packet.id} belongs to a different claim`);
        if (!decision.observationIds.includes(packet.observationId)) {
          fail(`Proof packet ${packet.id} is not linked by decision ${decision.id}`);
        }
        packetReferences.set(packetId, (packetReferences.get(packetId) ?? 0) + 1);
      }
    }
    for (const packet of packets) {
      if (packetReferences.get(packet.id) !== 1) fail(`Proof packet ${packet.id} is orphaned or multiply referenced`);
      const { packetSha256, ...withoutPacketHash } = packet;
      if (fingerprint(withoutPacketHash) !== packetSha256) fail(`Proof packet ${packet.id} has an invalid hash`);
      if (packet.extracts.some((extract) => sha256(extract.extract) !== extract.extractSha256)) {
        fail(`Proof packet ${packet.id} contains a tampered extract`);
      }
      const linked = observationById.get(packet.observationId);
      if (!linked || linked.run.id !== monitor.id) fail(`Proof packet ${packet.id} cites an unknown monitor observation`);
      const { observation } = linked;
      if (
        packet.sourceId !== observation.sourceId ||
        packet.observedAt !== observation.observedAt ||
        packet.requestedUrl !== observation.requestedUrl ||
        packet.finalUrl !== observation.finalUrl ||
        packet.rawSha256 !== observation.rawSha256 ||
        packet.normalizedSha256 !== observation.normalizedSha256
      ) fail(`Proof packet ${packet.id} does not match its observation metadata`);
      const fragment = observation.fragmentChecks.find((item) => item.id === packet.fragmentId);
      if (!fragment || fragment.contextSha256 !== packet.contextSha256 || !fragment.evidence) {
        fail(`Proof packet ${packet.id} does not match an observed fragment`);
      }
      const expectedExtracts = fragment.evidence.map(({ extract, extractSha256 }) => ({ extract, extractSha256 }));
      if (!sameArray(packet.extracts, expectedExtracts)) fail(`Proof packet ${packet.id} extracts do not match its fragment`);
    }
  }
}

/** Applies present-day completeness and hash checks only to current evidence. */
export function validateCurrentEvidenceRelease({ catalog, monitoringReports, evidenceContracts, evidenceDecisions }) {
  const currentMonitors = monitoringReports.runs.filter((run) => run.catalogReleaseId === catalog.releaseId);
  if (currentMonitors.length === 0) fail(`No monitoring run exists for current catalog release ${catalog.releaseId}`);
  const sourceIds = new Set(catalog.sources.map((source) => source.id));
  for (const run of currentMonitors.filter((run) => run.complete)) {
    const runSourceIds = new Set(run.observations.map((observation) => observation.sourceId));
    if (runSourceIds.size !== sourceIds.size || [...sourceIds].some((sourceId) => !runSourceIds.has(sourceId))) {
      fail(`Complete monitor run ${run.id} does not cover every current source`);
    }
  }

  const currentRuns = evidenceDecisions.runs.filter(
    (run) => run.schemaVersion === 2 && run.mode === "authoritative_automation" && run.eligibleForActions && run.catalogReleaseId === catalog.releaseId,
  );
  if (currentRuns.length === 0) fail(`No action-eligible authoritative run exists for current catalog release ${catalog.releaseId}`);
  const currentRun = currentRuns.at(-1);
  if (currentRun.policyVersion !== evidenceContracts.policyVersion) fail(`Current automation run ${currentRun.id} targets a different evidence policy`);
  const currentMonitor = monitoringReports.runs.find((run) => run.id === currentRun.monitoringRunId);
  if (!currentMonitor?.complete) {
    fail(`Current automation run ${currentRun.id} must reference a complete monitoring run`);
  }

  const claims = new Map(catalog.claims.map((claim) => [claim.id, claim]));
  const decisionIds = currentRun.decisions.map((decision) => decision.claimId);
  if (new Set(decisionIds).size !== claims.size || decisionIds.length !== claims.size || [...claims.keys()].some((id) => !decisionIds.includes(id))) {
    fail(`Current automation run ${currentRun.id} must decide every current claim exactly once`);
  }
  const packetById = new Map((currentRun.proofPackets ?? []).map((packet) => [packet.id, packet]));
  for (const decision of currentRun.decisions) {
    const claim = claims.get(decision.claimId);
    if (!claim || decision.expectedFactSha256 !== fingerprint(claim.fact) || decision.expectedApplicabilitySha256 !== fingerprint(claim.applicability)) {
      fail(`Current decision ${decision.id} does not match its parsed claim`);
    }
    const needsProof = decision.mayAutoPublish || decision.state === "current" || decision.state === "due";
    if (needsProof && (!decision.proofPacketIds?.length || decision.proofPacketIds.some((id) => packetById.get(id)?.claimId !== claim.id))) {
      fail(`Publish-supporting current decision ${decision.id} lacks a complete proof trace`);
    }
  }
}
