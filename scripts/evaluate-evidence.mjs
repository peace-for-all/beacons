import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";
import { evaluateEvidenceAutomation, fingerprint } from "./lib/evidence-automation-core.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const catalogPath = fileURLToPath(new URL("../content/catalog.json", import.meta.url));
const contractsPath = fileURLToPath(new URL("../content/evidence-contracts.json", import.meta.url));
const monitoringConfigPath = fileURLToPath(new URL("../content/monitoring-config.json", import.meta.url));
const monitoringPath = fileURLToPath(new URL("../content/monitoring-reports.json", import.meta.url));
const reportsPath = fileURLToPath(new URL("../content/evidence-decisions.json", import.meta.url));

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});
const { contentCatalogSchema, evidenceContractsSchema, monitoringConfigSchema, monitoringReportsSchema, evidenceAutomationReportsSchema, evidenceAutomationRunSchema, isoInstantSchema } = await vite.ssrLoadModule("/lib/domain/schemas.ts");
const [catalog, contracts, monitoringConfig, monitoringReports, reports] = await Promise.all([
  readFile(catalogPath, "utf8").then(JSON.parse).then((value) => contentCatalogSchema.parse(value)),
  readFile(contractsPath, "utf8").then(JSON.parse).then((value) => evidenceContractsSchema.parse(value)),
  readFile(monitoringConfigPath, "utf8").then(JSON.parse).then((value) => monitoringConfigSchema.parse(value)),
  readFile(monitoringPath, "utf8").then(JSON.parse).then((value) => monitoringReportsSchema.parse(value)),
  readFile(reportsPath, "utf8").then(JSON.parse).then((value) => evidenceAutomationReportsSchema.parse(value)),
]);
await vite.close();
const requestedMonitoringRun = argumentValue("--monitoring-run");
const monitoringRun = requestedMonitoringRun
  ? monitoringReports.runs.find((run) => run.id === requestedMonitoringRun)
  : [...monitoringReports.runs].reverse().find((run) => run.catalogReleaseId === catalog.releaseId);
if (!monitoringRun) throw new Error("No monitoring run is available");
const assessedAt = argumentValue("--assessed-at") ?? new Date().toISOString();
isoInstantSchema.parse(assessedAt);
const evaluated = evaluateEvidenceAutomation({ catalog, contracts, monitoringRun, monitoringConfig, assessedAt });
const previousRunSha256 = reports.runs.at(-1)?.reportSha256 ?? null;
const runWithoutHash = {
  schemaVersion: 2,
  id: `automation.${monitoringRun.id.replace(/^monitor\./, "")}.${fingerprint(`${assessedAt}:${contracts.policyVersion}`).slice(0, 12)}`,
  mode: "authoritative_automation",
  eligibleForActions: true,
  catalogReleaseId: catalog.releaseId,
  monitoringRunId: monitoringRun.id,
  policyVersion: contracts.policyVersion,
  assessedAt,
  previousRunSha256,
  summary: evaluated.summary,
  decisions: evaluated.decisions,
  proofPackets: evaluated.proofPackets,
};
const run = evidenceAutomationRunSchema.parse({ ...runWithoutHash, reportSha256: fingerprint(runWithoutHash) });

if (process.argv.includes("--dry-run")) {
  process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
} else {
  if (reports.runs.some((existing) => existing.id === run.id)) throw new Error(`Automation run already exists: ${run.id}`);
  const next = { ...reports, runs: [...reports.runs, run] };
  const temporaryPath = `${reportsPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporaryPath, reportsPath);
  process.stdout.write(`Recorded authoritative automation run ${run.id}: ${run.summary.states.current} supported claims, ${run.summary.exceptions} withheld claims, ${run.proofPackets.length} traceable proof packets.\n`);
}
