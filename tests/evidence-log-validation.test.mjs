import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  validateCurrentEvidenceRelease,
  validateEvidenceLogHistory,
} from "../scripts/lib/evidence-log-validation.mjs";
import { fingerprint } from "../scripts/lib/evidence-automation-core.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const instant = "2026-09-02T12:00:00.000Z";
const rawHash = "a".repeat(64);
const normalizedHash = "b".repeat(64);
const contextHash = "c".repeat(64);
const fact = { kind: "stay_rule", rule: { kind: "per_entry", allowedDays: 30 } };
const applicability = { nationalities: ["RU"], passportTypes: ["ordinary"], travellerKinds: ["adult"] };

function fixture() {
  const extract = "Official 30-day entry rule";
  const fragment = {
    id: "fragment.example",
    claimIds: ["claim.example"],
    status: "exact_match",
    contextSha256: contextHash,
    evidence: [{ extract, extractSha256: hash(extract) }],
  };
  const observation = {
    id: "observation.example",
    sourceId: "source.example",
    observedAt: instant,
    requestedUrl: "https://example.gov/entry",
    finalUrl: "https://example.gov/entry",
    rawSha256: rawHash,
    normalizedSha256: normalizedHash,
    fragmentChecks: [fragment],
  };
  const monitoringRun = {
    id: "monitor.example",
    catalogReleaseId: "release.example",
    complete: true,
    observations: [observation],
  };
  const packetWithoutHash = {
    schemaVersion: 1,
    id: "proof.example",
    claimId: "claim.example",
    claimRevision: 1,
    factSha256: fingerprint(fact),
    applicabilitySha256: fingerprint(applicability),
    sourceId: observation.sourceId,
    observationId: observation.id,
    observedAt: observation.observedAt,
    requestedUrl: observation.requestedUrl,
    finalUrl: observation.finalUrl,
    rawSha256: rawHash,
    normalizedSha256: normalizedHash,
    fragmentId: fragment.id,
    contextSha256: fragment.contextSha256,
    extracts: fragment.evidence,
    extractorId: "fixture",
    extractorVersion: "fixture-v1",
  };
  const decision = {
    id: "decision.example",
    claimId: "claim.example",
    observationIds: [observation.id],
    proofPacketIds: [packetWithoutHash.id],
    state: "current",
    mayAutoPublish: true,
    expectedFactSha256: fingerprint(fact),
    expectedApplicabilitySha256: fingerprint(applicability),
  };
  const runWithoutHash = {
    id: "automation.example",
    schemaVersion: 2,
    mode: "authoritative_automation",
    eligibleForActions: true,
    catalogReleaseId: "release.example",
    monitoringRunId: monitoringRun.id,
    policyVersion: "policy.example",
    previousRunSha256: null,
    decisions: [decision],
    proofPackets: [{ ...packetWithoutHash, packetSha256: fingerprint(packetWithoutHash) }],
  };
  const automationRun = { ...runWithoutHash, reportSha256: fingerprint(runWithoutHash) };
  return {
    catalog: { releaseId: "release.example", sources: [{ id: "source.example" }], claims: [{ id: "claim.example", revision: 1, fact, applicability }] },
    monitoringConfig: { fragmentChecks: [] },
    monitoringReports: { runs: [monitoringRun] },
    evidenceContracts: { policyVersion: "policy.example" },
    evidenceDecisions: { runs: [automationRun] },
  };
}

function refreshReportHash(run) {
  const withoutHash = { ...run };
  delete withoutHash.reportSha256;
  run.reportSha256 = fingerprint(withoutHash);
}

test("validates internally consistent history and a complete current release", () => {
  const input = fixture();
  validateEvidenceLogHistory(input);
  validateCurrentEvidenceRelease(input);
});

test("the checked-in m2/m3 records remain internally valid history", async () => {
  const [monitoringReports, evidenceDecisions] = await Promise.all([
    readFile(new URL("../content/monitoring-reports.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../content/evidence-decisions.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  validateEvidenceLogHistory({ monitoringReports, evidenceDecisions });
});

test("rejects duplicate IDs, cross-release links, and tampered packets", () => {
  const duplicate = fixture();
  duplicate.monitoringReports.runs.push(structuredClone(duplicate.monitoringReports.runs[0]));
  assert.throws(() => validateEvidenceLogHistory(duplicate), /Duplicate monitoring run ID/);

  const crossRelease = fixture();
  crossRelease.evidenceDecisions.runs[0].catalogReleaseId = "release.other";
  refreshReportHash(crossRelease.evidenceDecisions.runs[0]);
  assert.throws(() => validateEvidenceLogHistory(crossRelease), /different releases/);

  const tampered = fixture();
  tampered.evidenceDecisions.runs[0].proofPackets[0].extracts[0].extract = "altered";
  refreshReportHash(tampered.evidenceDecisions.runs[0]);
  assert.throws(() => validateEvidenceLogHistory(tampered), /invalid hash|tampered extract/);
});

test("requires a complete monitor and exact claim set only for the current release", () => {
  const noCurrent = fixture();
  noCurrent.monitoringReports.runs[0].catalogReleaseId = "release.history";
  assert.throws(() => validateCurrentEvidenceRelease(noCurrent), /No monitoring run exists/);

  const incompleteMonitor = fixture();
  incompleteMonitor.monitoringReports.runs[0].complete = false;
  assert.throws(() => validateCurrentEvidenceRelease(incompleteMonitor), /must reference a complete monitoring run/);

  const incompleteClaims = fixture();
  incompleteClaims.catalog.claims.push({ id: "claim.new", revision: 1, fact, applicability });
  assert.throws(() => validateCurrentEvidenceRelease(incompleteClaims), /must decide every current claim exactly once/);
});
