import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";
import {
  validateCurrentEvidenceRelease,
  validateEvidenceLogHistory,
} from "./lib/evidence-log-validation.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const catalogPath = fileURLToPath(new URL("../content/catalog.json", import.meta.url));
const monitoringConfigPath = fileURLToPath(new URL("../content/monitoring-config.json", import.meta.url));
const monitoringReportsPath = fileURLToPath(new URL("../content/monitoring-reports.json", import.meta.url));
const evidenceContractsPath = fileURLToPath(new URL("../content/evidence-contracts.json", import.meta.url));
const evidenceDecisionsPath = fileURLToPath(new URL("../content/evidence-decisions.json", import.meta.url));
const corridorRequirementsPath = fileURLToPath(new URL("../content/corridor-requirements.json", import.meta.url));
const journeyGuidancePath = fileURLToPath(new URL("../content/journey-guidance.json", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

try {
  const { contentCatalogSchema, monitoringConfigSchema, monitoringReportsSchema, evidenceContractsSchema, evidenceAutomationReportsSchema } = await vite.ssrLoadModule(
    "/lib/domain/schemas.ts",
  );
  const {
    corridorRequirementManifestCollectionSchema,
    summarizeCorridorManifest,
    summarizeLegalStageClosure,
    validateCorridorRequirementManifests,
  } = await vite.ssrLoadModule("/lib/domain/corridor-requirement-manifest.ts");
  const { journeyGuidanceCollectionSchema, validateJourneyGuidance } = await vite.ssrLoadModule(
    "/lib/domain/journey-guidance.ts",
  );
  const { evaluateFirst72Packet } = await vite.ssrLoadModule(
    "/lib/domain/first-72-hour-readiness.ts",
  );
  const raw = JSON.parse(await readFile(catalogPath, "utf8"));
  const catalog = contentCatalogSchema.parse(raw);
  const monitoringConfig = monitoringConfigSchema.parse(
    JSON.parse(await readFile(monitoringConfigPath, "utf8")),
  );
  const monitoringReports = monitoringReportsSchema.parse(
    JSON.parse(await readFile(monitoringReportsPath, "utf8")),
  );
  const evidenceContracts = evidenceContractsSchema.parse(JSON.parse(await readFile(evidenceContractsPath, "utf8")));
  const evidenceDecisions = evidenceAutomationReportsSchema.parse(JSON.parse(await readFile(evidenceDecisionsPath, "utf8")));
  const corridorRequirements = corridorRequirementManifestCollectionSchema.parse(
    JSON.parse(await readFile(corridorRequirementsPath, "utf8")),
  );
  const journeyGuidance = journeyGuidanceCollectionSchema.parse(
    JSON.parse(await readFile(journeyGuidancePath, "utf8")),
  );
  const sourceIds = new Set(catalog.sources.map((source) => source.id));
  const claimIds = new Set(catalog.claims.map((claim) => claim.id));
  for (const check of monitoringConfig.fragmentChecks) {
    if (!sourceIds.has(check.sourceId)) throw new Error(`Unknown monitor source: ${check.sourceId}`);
    for (const claimId of check.claimIds) {
      if (!claimIds.has(claimId)) throw new Error(`Unknown monitor claim: ${claimId}`);
    }
  }
  const monitoringRunIds = new Set(monitoringReports.runs.map((run) => run.id));
  const monitoringRunsById = new Map(monitoringReports.runs.map((run) => [run.id, run]));
  const fragmentById = new Map(monitoringConfig.fragmentChecks.map((check) => [check.id, check]));
  for (const contract of evidenceContracts.contracts) {
    const claim = catalog.claims.find((item) => item.id === contract.claimId);
    if (!claim) throw new Error(`Unknown contracted claim: ${contract.claimId}`);
    if (claim.revision !== contract.claimRevision) throw new Error(`Contract ${contract.id} pins the wrong claim revision`);
    if (!monitoringRunIds.has(contract.baselineProvenance.monitoringRunId)) throw new Error(`Contract ${contract.id} cites an unknown monitoring run`);
    const baselineRun = monitoringRunsById.get(contract.baselineProvenance.monitoringRunId);
    const mappedFragments = [
      ...contract.requiredFragments,
      ...(contract.precedenceResolution?.conflictingFragments ?? []),
    ];
    for (const required of mappedFragments) {
      const fragment = fragmentById.get(required.fragmentId);
      if (!fragment || fragment.sourceId !== required.sourceId || !fragment.claimIds.includes(contract.claimId)) {
        throw new Error(`Contract ${contract.id} has an invalid claim/source/fragment mapping`);
      }
      if (!contract.precedenceResolution) continue;
      const observation = baselineRun?.observations.find((item) => item.sourceId === required.sourceId);
      const baselineFragment = observation?.fragmentChecks.find((item) => item.id === required.fragmentId);
      if (
        observation?.status !== "reachable" ||
        baselineFragment?.status !== "exact_match" ||
        baselineFragment.contextSha256 !== required.expectedContextSha256 ||
        !baselineFragment.evidence?.length
      ) {
        throw new Error(`Contract ${contract.id} does not pin an exact evidenced baseline for ${required.fragmentId}`);
      }
    }
  }
  validateEvidenceLogHistory({ monitoringReports, evidenceDecisions });
  validateCurrentEvidenceRelease({
    catalog,
    monitoringConfig,
    monitoringReports,
    evidenceContracts,
    evidenceDecisions,
  });
  validateCorridorRequirementManifests({
    collection: corridorRequirements,
    catalog,
    evidenceReports: evidenceDecisions,
  });
  validateJourneyGuidance({
    collection: journeyGuidance,
    catalog,
    evidenceReports: evidenceDecisions,
    manifests: corridorRequirements.manifests,
    asOf: new Date().toISOString(),
  });
  const first72Packets = corridorRequirements.manifests.map((manifest) =>
    evaluateFirst72Packet({
      manifest,
      operationalRecords: journeyGuidance.operationalRecords,
      asOf: new Date().toISOString(),
    }),
  );
  if (first72Packets.some((packet) => packet.actionReady)) {
    throw new Error("A research-target first-72-hour packet cannot be action-ready");
  }
  for (const manifest of corridorRequirements.manifests) {
    await readFile(new URL(`../${manifest.decisionRecord}`, import.meta.url), "utf8");
  }
  const corridorSummary = corridorRequirements.manifests
    .map((manifest) => {
      const summary = summarizeCorridorManifest(manifest);
      const closure = summarizeLegalStageClosure(manifest);
      const first72 = first72Packets.find((packet) => packet.corridorId === manifest.id);
      return `${manifest.id}: ${summary.required} required, ${summary.optional} optional; ${summary.statuses.current} current, ${summary.statuses.incomplete} incomplete, ${summary.statuses.contradictory} contradictory, ${summary.statuses.missing} missing, ${summary.statuses.not_applicable} not applicable; legal closure ${closure.current} current, ${closure.incomplete} incomplete, ${closure.evidenceGapSlots} evidence-gap slots, ${closure.runtimeInputSlots} runtime-input slots, ${closure.unclassifiedSlots} unclassified, researchClosureReady=${closure.researchClosureReady}, actionReady=${closure.actionReady}; first72=${first72?.coverageState ?? "not_evaluated"}, first72ActionReady=${first72?.actionReady ?? false}`;
    })
    .join("; ");
  process.stdout.write(
    `Validated ${catalog.sources.length} sources, ${catalog.claims.length} claims, ${catalog.routes.length} routes, ${catalog.places.length} places, ${monitoringConfig.fragmentChecks.length} fragment monitors, ${evidenceContracts.contracts.length} claim contracts, ${monitoringReports.runs.length} observation runs, ${evidenceDecisions.runs.length} automation runs, ${corridorRequirements.manifests.length} corridor manifest, ${journeyGuidance.authorityPolicies.length} journey authority policies, ${journeyGuidance.guidanceItems.length} guidance items, and ${journeyGuidance.operationalRecords.length} operational records. ${corridorSummary}.\n`,
  );
} finally {
  await vite.close();
}
