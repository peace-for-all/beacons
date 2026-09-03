import { createHash } from "node:crypto";

const DAY_MS = 86_400_000;

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function fingerprint(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function decisionForUncontractedClaim(claim) {
  if (claim.contradictingSourceIds.length > 0) {
    return {
      state: "contradictory",
      publicAction: "queue_exception",
      handler: "precedence_resolution",
      reasonCodes: ["catalog_records_authoritative_disagreement", "conflicts_are_not_resolved_by_source_count"],
    };
  }
  return {
    state: "uncovered",
    publicAction: "queue_exception",
    handler: "contract_authoring",
    reasonCodes: ["no_executable_claim_contract"],
  };
}

export function evaluateEvidenceAutomation({ catalog, contracts, monitoringRun, monitoringConfig, assessedAt }) {
  const assessedAtMs = new Date(assessedAt).valueOf();
  const observedAtMs = new Date(monitoringRun.observedAt).valueOf();
  if (!Number.isFinite(assessedAtMs) || !Number.isFinite(observedAtMs)) throw new Error("invalid_assessment_time");
  if (observedAtMs > assessedAtMs) throw new Error("future_monitoring_run");
  if (!monitoringRun.complete) throw new Error("incomplete_monitoring_run");
  if (monitoringRun.schemaVersion !== 2 || monitoringRun.mode !== "evidence_acquisition") {
    throw new Error("monitoring_run_not_evidence_acquisition");
  }
  if (monitoringRun.catalogReleaseId !== catalog.releaseId) throw new Error("catalog_release_mismatch");

  const sources = new Map(catalog.sources.map((source) => [source.id, source]));
  const observations = new Map(monitoringRun.observations.map((observation) => [observation.sourceId, observation]));
  const contractByClaim = new Map();
  for (const contract of contracts.contracts) {
    if (contractByClaim.has(contract.claimId)) throw new Error(`duplicate_claim_contract:${contract.claimId}`);
    contractByClaim.set(contract.claimId, contract);
    const claim = catalog.claims.find((item) => item.id === contract.claimId);
    if (!claim) throw new Error(`unknown_contract_claim:${contract.claimId}`);
    for (const required of contract.requiredFragments) {
      const configuredFragment = monitoringConfig.fragmentChecks.find(
        (fragment) => fragment.id === required.fragmentId,
      );
      if (
        !configuredFragment ||
        configuredFragment.sourceId !== required.sourceId ||
        !configuredFragment.claimIds.includes(claim.id) ||
        !claim.supportingSourceIds.includes(required.sourceId)
      ) {
        throw new Error(`invalid_contract_fragment_mapping:${contract.id}:${required.fragmentId}`);
      }
    }
  }

  const proofPackets = [];
  const decisions = catalog.claims.map((claim) => {
    const contract = contractByClaim.get(claim.id);
    const base = {
      id: `decision.${claim.id.replace(/^claim\./, "")}.${monitoringRun.id.replace(/^monitor\./, "")}`,
      claimId: claim.id,
      observationIds: [],
      independentGroups: [],
      expectedFactSha256: fingerprint(claim.fact),
      expectedApplicabilitySha256: fingerprint(claim.applicability),
      mayAutoPublish: false,
      mayRenewFreshness: false,
      proofPacketIds: [],
    };
    if (!contract) return { ...base, contractId: null, contractVersion: null, basis: null, ...decisionForUncontractedClaim(claim) };

    const withContract = {
      ...base,
      contractId: contract.id,
      contractVersion: contract.version,
      basis: contract.basis,
    };
    if (claim.contradictingSourceIds.length > 0) {
      return { ...withContract, ...decisionForUncontractedClaim(claim) };
    }
    if (contract.claimRevision !== claim.revision ||
      contract.expectedFactSha256 !== base.expectedFactSha256 ||
      contract.expectedApplicabilitySha256 !== base.expectedApplicabilitySha256) {
      return {
        ...withContract,
        state: "changed",
        publicAction: "queue_exception",
        handler: "semantic_reextraction",
        reasonCodes: ["structured_claim_changed_since_contract"],
      };
    }

    const observationIds = [];
    const independentGroups = new Set();
    const failures = [];
    const claimProofPacketIds = [];
    for (const required of contract.requiredFragments) {
      const source = sources.get(required.sourceId);
      const observation = observations.get(required.sourceId);
      if (!source || !observation) {
        failures.push("required_observation_missing");
        continue;
      }
      observationIds.push(observation.id);
      independentGroups.add(source.independenceGroupId);
      if (observation.status !== "reachable") {
        failures.push("required_source_unavailable");
        continue;
      }
      const fragment = observation.fragmentChecks.find((item) => item.id === required.fragmentId);
      if (!fragment || fragment.status === "not_evaluated") {
        failures.push("required_fragment_not_evaluated");
      } else if (fragment.status !== "exact_match") {
        failures.push(`required_fragment_${fragment.status}`);
      } else if (fragment.contextSha256 !== required.expectedContextSha256) {
        failures.push("pinned_context_changed");
      } else if (!fragment.evidence?.length) {
        failures.push("proof_extract_missing");
      } else {
        const packetWithoutHash = {
          schemaVersion: 1,
          id: `proof.${claim.id.replace(/^claim\./, "")}.${fingerprint(`${observation.id}:${required.fragmentId}`).slice(0, 16)}`,
          claimId: claim.id,
          claimRevision: claim.revision,
          factSha256: base.expectedFactSha256,
          applicabilitySha256: base.expectedApplicabilitySha256,
          sourceId: source.id,
          observationId: observation.id,
          observedAt: observation.observedAt,
          requestedUrl: observation.requestedUrl,
          finalUrl: observation.finalUrl,
          rawSha256: observation.rawSha256,
          normalizedSha256: observation.normalizedSha256,
          fragmentId: fragment.id,
          contextSha256: fragment.contextSha256,
          extracts: fragment.evidence.map(({ extract, extractSha256 }) => ({ extract, extractSha256 })),
          extractorId: "deterministic-fragment-locator",
          extractorVersion: "fragment-locator-v1",
        };
        const packet = { ...packetWithoutHash, packetSha256: fingerprint(packetWithoutHash) };
        proofPackets.push(packet);
        claimProofPacketIds.push(packet.id);
      }
    }
    const groups = [...independentGroups].sort();
    const ageDays = (assessedAtMs - observedAtMs) / DAY_MS;
    if (failures.length > 0) {
      const unavailable = failures.every((reason) => reason.includes("unavailable") || reason.includes("missing") || reason.includes("not_evaluated"));
      return {
        ...withContract,
        observationIds,
        independentGroups: groups,
        state: unavailable ? "unavailable" : "changed",
        publicAction: "queue_exception",
        handler: unavailable ? "source_recovery" : "semantic_reextraction",
        proofPacketIds: claimProofPacketIds,
        reasonCodes: [...new Set(failures)],
      };
    }
    if (groups.length < contract.minimumIndependentGroups) {
      return {
        ...withContract,
        observationIds,
        independentGroups: groups,
        state: "candidate",
        publicAction: "queue_exception",
        handler: "source_discovery",
        reasonCodes: ["minimum_independent_authority_groups_not_met"],
        proofPacketIds: claimProofPacketIds,
      };
    }
    if (ageDays > contracts.staleAfterDays) {
      return { ...withContract, observationIds, independentGroups: groups, proofPacketIds: claimProofPacketIds, state: "stale", publicAction: "queue_exception", handler: "source_recovery", reasonCodes: ["monitoring_run_stale"] };
    }
    if (ageDays > contracts.currentForDays) {
      return { ...withContract, observationIds, independentGroups: groups, proofPacketIds: claimProofPacketIds, state: "due", publicAction: "no_change", handler: "scheduled_monitor", reasonCodes: ["monitoring_run_due"] };
    }
    return {
      ...withContract,
      observationIds,
      independentGroups: groups,
      proofPacketIds: claimProofPacketIds,
      state: "current",
      publicAction: "no_change",
      handler: "scheduled_monitor",
      mayAutoPublish: true,
      mayRenewFreshness: true,
      reasonCodes: ["pinned_fact_applicability_and_context_unchanged"],
    };
  });

  const states = Object.fromEntries(["current", "due", "candidate", "uncovered", "unavailable", "changed", "contradictory", "stale"].map((state) => [state, 0]));
  for (const decision of decisions) states[decision.state] += 1;
  return { decisions, proofPackets, summary: { total: decisions.length, states, exceptions: decisions.filter((decision) => decision.publicAction === "queue_exception").length } };
}
