import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { evaluateEvidenceAutomation, fingerprint } from "../scripts/lib/evidence-automation-core.mjs";

const fact = { kind: "stay_rule", rule: { kind: "per_entry", allowedDays: 30 } };
const applicability = { nationalities: ["RU"], passportTypes: ["ordinary"], travellerKinds: ["adult", "child"] };
const contextSha256 = "a".repeat(64);
const textSha256 = (value) => createHash("sha256").update(value).digest("hex");
const catalog = {
  releaseId: "release.test",
  sources: [{ id: "source.test", independenceGroupId: "lineage.test" }],
  claims: [{
    id: "claim.test", revision: 1, fact, applicability,
    contradictingSourceIds: [], supportingSourceIds: ["source.test"],
    producer: { kind: "deterministic_pipeline", systemId: "fixture-builder", version: "fixture-v2" },
  }],
};
const contracts = {
  schemaVersion: 2,
  policyVersion: "proof-policy-v2",
  currentForDays: 8,
  staleAfterDays: 14,
  contracts: [{
    schemaVersion: 2, id: "contract.test.v1", version: 1, claimId: "claim.test", claimRevision: 1,
    basis: "pinned_semantic_baseline", expectedFactSha256: fingerprint(fact),
    expectedApplicabilitySha256: fingerprint(applicability), minimumIndependentGroups: 1,
    requiredFragments: [{ sourceId: "source.test", fragmentId: "fragment.test", expectedContextSha256: contextSha256 }],
    policyVersion: "proof-policy-v2",
    activatedAt: "2026-09-02T10:30:00.000Z",
    baselineProvenance: {
      kind: "deterministic_pipeline",
      producerId: "contract-builder",
      producerVersion: "contract-builder-v2",
      producedAt: "2026-09-02T10:30:00.000Z",
      monitoringRunId: "monitor.test",
    },
  }],
};
const monitoringConfig = {
  fragmentChecks: [{
    id: "fragment.test",
    sourceId: "source.test",
    claimIds: ["claim.test"],
  }],
};
const monitoringRun = {
  schemaVersion: 2,
  id: "monitor.test", mode: "evidence_acquisition", catalogReleaseId: "release.test", complete: true,
  observedAt: "2026-09-02T10:00:00.000Z",
  normalizerVersion: "visible-text-v2",
  observations: [{
    id: "observation.test", sourceId: "source.test", status: "reachable",
    observedAt: "2026-09-02T10:00:00.000Z",
    requestedUrl: "https://example.gov/entry",
    finalUrl: "https://example.gov/entry",
    rawSha256: "b".repeat(64),
    normalizedSha256: "c".repeat(64),
    fragmentChecks: [{
      id: "fragment.test",
      status: "exact_match",
      contextSha256,
      evidence: [{
        start: 10,
        end: 35,
        extract: "Ordinary passports: up to 30 days.",
        extractSha256: textSha256("Ordinary passports: up to 30 days."),
      }],
    }],
  }],
};

function evaluate(overrides = {}) {
  return evaluateEvidenceAutomation({
    catalog: overrides.catalog ?? catalog,
    contracts: overrides.contracts ?? contracts,
    monitoringRun: overrides.monitoringRun ?? monitoringRun,
    monitoringConfig: overrides.monitoringConfig ?? monitoringConfig,
    assessedAt: "2026-09-02T12:00:00.000Z",
  }).decisions[0];
}

test("an exact pinned fact, applicability, and proof packet authorizes automation", () => {
  const evaluated = evaluateEvidenceAutomation({
    catalog,
    contracts,
    monitoringRun,
    monitoringConfig,
    assessedAt: "2026-09-02T12:00:00.000Z",
  });
  const decision = evaluated.decisions[0];
  assert.equal(decision.state, "current");
  assert.equal(decision.mayAutoPublish, true);
  assert.equal(decision.mayRenewFreshness, true);
  assert.equal(decision.publicAction, "no_change");
  assert.equal(decision.proofPacketIds.length, 1);
  assert.equal(evaluated.proofPackets.length, 1);
  assert.equal(evaluated.proofPackets[0].id, decision.proofPacketIds[0]);
  assert.equal(evaluated.proofPackets[0].claimId, "claim.test");
  assert.equal(evaluated.proofPackets[0].sourceId, "source.test");
  assert.deepEqual(evaluated.proofPackets[0].extracts, [{
    extract: "Ordinary passports: up to 30 days.",
    extractSha256: textSha256("Ordinary passports: up to 30 days."),
  }]);
  assert.match(evaluated.proofPackets[0].packetSha256, /^[a-f0-9]{64}$/);
});

test("source context or structured claim changes fail closed into automatic re-extraction", () => {
  const changedContext = structuredClone(monitoringRun);
  changedContext.observations[0].fragmentChecks[0].contextSha256 = "b".repeat(64);
  assert.equal(evaluate({ monitoringRun: changedContext }).state, "changed");
  assert.equal(evaluate({ monitoringRun: changedContext }).handler, "semantic_reextraction");
  assert.equal(evaluate({ monitoringRun: changedContext }).mayAutoPublish, false);

  const changedClaim = structuredClone(catalog);
  changedClaim.claims[0].fact.rule.allowedDays = 31;
  assert.equal(evaluate({ catalog: changedClaim }).state, "changed");
  assert.equal(evaluate({ catalog: changedClaim }).handler, "semantic_reextraction");
});

test("a missing extract cannot create a proof packet or authorize publication", () => {
  const withoutExtract = structuredClone(monitoringRun);
  delete withoutExtract.observations[0].fragmentChecks[0].evidence;
  const evaluated = evaluateEvidenceAutomation({
    catalog,
    contracts,
    monitoringRun: withoutExtract,
    monitoringConfig,
    assessedAt: "2026-09-02T12:00:00.000Z",
  });
  assert.equal(evaluated.decisions[0].state, "unavailable");
  assert.equal(evaluated.decisions[0].mayAutoPublish, false);
  assert.deepEqual(evaluated.decisions[0].proofPacketIds, []);
  assert.deepEqual(evaluated.proofPackets, []);
  assert.deepEqual(evaluated.decisions[0].reasonCodes, ["proof_extract_missing"]);
});

test("a failed required source cannot be hidden by an older or peer success", () => {
  const failed = structuredClone(monitoringRun);
  failed.observations[0].status = "parse_failed";
  assert.equal(evaluate({ monitoringRun: failed }).state, "unavailable");
  assert.equal(evaluate({ monitoringRun: failed }).handler, "source_recovery");
});

test("contracts cannot use an unrelated source or fragment as proof", () => {
  const unrelated = structuredClone(monitoringConfig);
  unrelated.fragmentChecks[0].claimIds = ["claim.other"];
  assert.throws(
    () => evaluate({ monitoringConfig: unrelated }),
    /invalid_contract_fragment_mapping/,
  );
});

test("uncontracted disagreements remain policy exceptions, never votes", () => {
  const conflictingCatalog = structuredClone(catalog);
  conflictingCatalog.claims[0].contradictingSourceIds = ["source.test"];
  const decision = evaluate({ catalog: conflictingCatalog, contracts: { ...contracts, contracts: [] } });
  assert.equal(decision.state, "contradictory");
  assert.equal(decision.handler, "precedence_resolution");
  assert.equal(decision.mayAutoPublish, false);
});

test("a pinned controlling-law resolution preserves the guidance discrepancy", () => {
  const resolvedCatalog = structuredClone(catalog);
  resolvedCatalog.sources[0].precedence = "controlling_law";
  resolvedCatalog.sources[0].authority = "official_legal_text";
  resolvedCatalog.sources.push({
    id: "source.guidance",
    independenceGroupId: "lineage.guidance",
    precedence: "official_guidance",
    authority: "foreign_ministry",
  });
  resolvedCatalog.claims[0].contradictingSourceIds = ["source.guidance"];

  const resolvedContracts = structuredClone(contracts);
  resolvedContracts.contracts[0].precedenceResolution = {
    kind: "controlling_law_over_official_guidance",
    controllingSourceId: "source.test",
    conflictingFragments: [{
      sourceId: "source.guidance",
      fragmentId: "fragment.guidance",
      expectedContextSha256: "d".repeat(64),
    }],
  };
  resolvedContracts.contracts[0].minimumIndependentGroups = 2;

  const resolvedConfig = structuredClone(monitoringConfig);
  resolvedConfig.fragmentChecks.push({
    id: "fragment.guidance",
    sourceId: "source.guidance",
    claimIds: ["claim.test"],
  });
  const resolvedRun = structuredClone(monitoringRun);
  resolvedRun.observations.push({
    ...structuredClone(monitoringRun.observations[0]),
    id: "observation.guidance",
    sourceId: "source.guidance",
    fragmentChecks: [{
      id: "fragment.guidance",
      status: "exact_match",
      contextSha256: "d".repeat(64),
      evidence: [{
        start: 0,
        end: 30,
        extract: "Insurance is recommended.",
        extractSha256: textSha256("Insurance is recommended."),
      }],
    }],
  });

  const candidate = evaluate({
    catalog: resolvedCatalog,
    contracts: resolvedContracts,
    monitoringConfig: resolvedConfig,
    monitoringRun: resolvedRun,
  });
  assert.equal(candidate.state, "candidate", "conflicting guidance must not count as corroboration");

  resolvedContracts.contracts[0].minimumIndependentGroups = 1;
  const current = evaluate({
    catalog: resolvedCatalog,
    contracts: resolvedContracts,
    monitoringConfig: resolvedConfig,
    monitoringRun: resolvedRun,
  });
  assert.equal(current.state, "current");
  assert.equal(current.proofPacketIds.length, 2);
  assert.deepEqual(current.reasonCodes, [
    "pinned_fact_applicability_and_context_unchanged",
    "controlling_law_precedence_applied",
    "lower_precedence_discrepancy_preserved",
  ]);

  resolvedRun.observations[1].fragmentChecks[0].contextSha256 = "e".repeat(64);
  const changed = evaluate({
    catalog: resolvedCatalog,
    contracts: resolvedContracts,
    monitoringConfig: resolvedConfig,
    monitoringRun: resolvedRun,
  });
  assert.equal(changed.state, "changed");
});

test("a precedence contract rejects non-law controllers and partial conflict coverage", () => {
  const resolvedCatalog = structuredClone(catalog);
  resolvedCatalog.sources[0].precedence = "official_rule";
  resolvedCatalog.sources[0].authority = "official_legal_text";
  resolvedCatalog.sources.push({
    id: "source.guidance",
    independenceGroupId: "lineage.guidance",
    precedence: "official_guidance",
    authority: "foreign_ministry",
  });
  resolvedCatalog.claims[0].contradictingSourceIds = ["source.guidance"];
  const resolvedContracts = structuredClone(contracts);
  resolvedContracts.contracts[0].precedenceResolution = {
    kind: "controlling_law_over_official_guidance",
    controllingSourceId: "source.test",
    conflictingFragments: [{
      sourceId: "source.guidance",
      fragmentId: "fragment.guidance",
      expectedContextSha256: "d".repeat(64),
    }],
  };
  const resolvedConfig = structuredClone(monitoringConfig);
  resolvedConfig.fragmentChecks.push({ id: "fragment.guidance", sourceId: "source.guidance", claimIds: ["claim.test"] });
  assert.throws(
    () => evaluate({ catalog: resolvedCatalog, contracts: resolvedContracts, monitoringConfig: resolvedConfig }),
    /invalid_precedence_controller/,
  );

  resolvedCatalog.sources[0].precedence = "controlling_law";
  resolvedCatalog.claims[0].contradictingSourceIds.push("source.second-guidance");
  assert.throws(
    () => evaluate({ catalog: resolvedCatalog, contracts: resolvedContracts, monitoringConfig: resolvedConfig }),
    /incomplete_precedence_conflict_coverage/,
  );
});
