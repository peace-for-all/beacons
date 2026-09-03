import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});
const { evaluateCorroboration } = await vite.ssrLoadModule(
  "/lib/domain/corroboration.ts",
);

after(async () => vite.close());

const sources = [
  {
    sourceId: "law",
    publicationChainId: "legal-gazette",
    originEntityId: "legislature",
    independenceGroupId: "legal-gazette-lineage",
    precedence: "controlling_law",
  },
  {
    sourceId: "portal",
    publicationChainId: "immigration-portal",
    originEntityId: "immigration-authority",
    independenceGroupId: "immigration-portal-lineage",
    precedence: "operational_official",
  },
];

function observation(sourceId, overrides = {}) {
  return {
    observationId: `observation-${sourceId}`,
    sourceId,
    observedAt: "2026-09-02T10:00:00.000Z",
    status: "reachable",
    extractedFactFingerprint: "fact-30-days",
    applicabilityFingerprint: "ru-ordinary-adult-child-6-17",
    fragmentFingerprint: "fragment-passport-30-days",
    contextFingerprint: "context-passport-30-days",
    normalizerVersion: "visible-text-v1",
    extractorVersion: "structured-fact-v1",
    semanticState: "unchanged",
    ...overrides,
  };
}

function evaluate(overrides = {}) {
  return evaluateCorroboration({
    sources,
    observations: [observation("law"), observation("portal")],
    expectedFactFingerprint: "fact-30-days",
    expectedApplicabilityFingerprint: "ru-ordinary-adult-child-6-17",
    expectedFragmentFingerprint: "fragment-passport-30-days",
    expectedContextFingerprint: "context-passport-30-days",
    expectedNormalizerVersion: "visible-text-v1",
    expectedExtractorVersion: "structured-fact-v1",
    requiredSourceIds: ["law", "portal"],
    asOf: "2026-09-02T12:00:00.000Z",
    hasPinnedBaseline: false,
    ...overrides,
  });
}

test("two independent official publication chains corroborate automatically", () => {
  const decision = evaluate();
  assert.equal(decision.conclusion, "supported");
  assert.equal(decision.assurance, "machine_corroborated_candidate");
  assert.equal(decision.independentPublicationChains, 2);
  assert.equal(decision.mayRenewFreshness, false);
  assert.equal(decision.mustDemote, false);
});

test("an unchanged pinned baseline renews freshness automatically", () => {
  const decision = evaluate({ hasPinnedBaseline: true });
  assert.equal(decision.assurance, "baseline_continuous");
  assert.equal(decision.mayRenewFreshness, true);
  assert.equal(decision.mustDemote, false);
});

test("two URLs from one publication lineage count once", () => {
  const copiedSources = [
    sources[0],
    {
      ...sources[0],
      sourceId: "law-mirror",
    },
  ];
  const decision = evaluate({
    sources: copiedSources,
    observations: [observation("law"), observation("law-mirror")],
  });
  assert.equal(decision.independentPublicationChains, 1);
  assert.equal(decision.assurance, "single_authority");
});

test("an authoritative contradiction blocks and demotes regardless of source count", () => {
  const decision = evaluate({
    hasPinnedBaseline: true,
    observations: [
      observation("law"),
      observation("portal", {
        extractedFactFingerprint: "fact-15-days",
        semanticState: "changed",
      }),
    ],
  });
  assert.equal(decision.conclusion, "contradictory");
  assert.equal(decision.assurance, "disputed");
  assert.equal(decision.mustDemote, true);
});

test("a failed monitoring run never extends freshness", () => {
  const decision = evaluate({
    hasPinnedBaseline: true,
    observations: [
      observation("law", { status: "parse_failed", semanticState: "unknown" }),
      observation("portal", { status: "unavailable", semanticState: "unknown" }),
    ],
  });
  assert.equal(decision.conclusion, "unknown");
  assert.equal(decision.mayRenewFreshness, false);
  assert.equal(decision.mustDemote, true);
});

test("one unchanged source cannot hide a failed required peer", () => {
  const decision = evaluate({
    hasPinnedBaseline: true,
    observations: [
      observation("law"),
      observation("portal", { status: "parse_failed", semanticState: "unknown" }),
    ],
  });
  assert.equal(decision.mayRenewFreshness, false);
  assert.equal(decision.mustDemote, true);
  assert.deepEqual(decision.reasonCodes, ["required_observation_failed"]);
});

test("a changed applicability cannot be hidden by another matching source", () => {
  const decision = evaluate({
    hasPinnedBaseline: true,
    observations: [
      observation("law"),
      observation("portal", { applicabilityFingerprint: "adult-only" }),
    ],
  });
  assert.equal(decision.mayRenewFreshness, false);
  assert.equal(decision.mustDemote, true);
  assert.deepEqual(decision.reasonCodes, ["baseline_applicability_changed"]);
});

test("the newest observation overrides an older success", () => {
  const decision = evaluate({
    hasPinnedBaseline: true,
    observations: [
      observation("law", { observationId: "law-old", observedAt: "2026-09-01T10:00:00.000Z" }),
      observation("law", { observationId: "law-new", status: "unavailable", semanticState: "unknown" }),
      observation("portal"),
    ],
  });
  assert.deepEqual(decision.reasonCodes, ["required_observation_failed"]);
});

test("future observations fail validation", () => {
  assert.throws(() => evaluate({
    observations: [
      observation("law", { observedAt: "2026-09-03T10:00:00.000Z" }),
      observation("portal"),
    ],
  }), /future_observation_time/);
});

test("a relevant baseline change fails closed into automatic re-extraction", () => {
  const decision = evaluate({
    hasPinnedBaseline: true,
    observations: [
      observation("law", { semanticState: "changed" }),
      observation("portal", { semanticState: "changed" }),
    ],
  });
  assert.equal(decision.conclusion, "unknown");
  assert.equal(decision.mayRenewFreshness, false);
  assert.equal(decision.mustDemote, true);
  assert.deepEqual(decision.reasonCodes, [
    "baseline_semantic_change_requires_reextraction",
  ]);
});
