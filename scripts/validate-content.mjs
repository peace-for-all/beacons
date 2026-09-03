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
  const sourceIds = new Set(catalog.sources.map((source) => source.id));
  const claimIds = new Set(catalog.claims.map((claim) => claim.id));
  for (const check of monitoringConfig.fragmentChecks) {
    if (!sourceIds.has(check.sourceId)) throw new Error(`Unknown monitor source: ${check.sourceId}`);
    for (const claimId of check.claimIds) {
      if (!claimIds.has(claimId)) throw new Error(`Unknown monitor claim: ${claimId}`);
    }
  }
  const monitoringRunIds = new Set(monitoringReports.runs.map((run) => run.id));
  const fragmentById = new Map(monitoringConfig.fragmentChecks.map((check) => [check.id, check]));
  for (const contract of evidenceContracts.contracts) {
    const claim = catalog.claims.find((item) => item.id === contract.claimId);
    if (!claim) throw new Error(`Unknown contracted claim: ${contract.claimId}`);
    if (claim.revision !== contract.claimRevision) throw new Error(`Contract ${contract.id} pins the wrong claim revision`);
    if (!monitoringRunIds.has(contract.baselineProvenance.monitoringRunId)) throw new Error(`Contract ${contract.id} cites an unknown monitoring run`);
    for (const required of contract.requiredFragments) {
      const fragment = fragmentById.get(required.fragmentId);
      if (!fragment || fragment.sourceId !== required.sourceId || !fragment.claimIds.includes(contract.claimId)) {
        throw new Error(`Contract ${contract.id} has an invalid claim/source/fragment mapping`);
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
  process.stdout.write(
    `Validated ${catalog.sources.length} sources, ${catalog.claims.length} claims, ${catalog.routes.length} routes, ${catalog.places.length} places, ${monitoringConfig.fragmentChecks.length} fragment monitors, ${evidenceContracts.contracts.length} claim contracts, ${monitoringReports.runs.length} observation runs, and ${evidenceDecisions.runs.length} automation runs.\n`,
  );
} finally {
  await vite.close();
}
