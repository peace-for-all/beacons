import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";
import { fetchOfficialSource, sha256 } from "./lib/evidence-monitor-core.mjs";

const catalogPath = fileURLToPath(new URL("../content/catalog.json", import.meta.url));
const configPath = fileURLToPath(new URL("../content/monitoring-config.json", import.meta.url));
const reportsPath = fileURLToPath(new URL("../content/monitoring-reports.json", import.meta.url));

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});
const {
  contentCatalogSchema,
  monitoringConfigSchema,
  monitoringReportsSchema,
  monitoringRunSchema,
  isoInstantSchema,
} = await vite.ssrLoadModule("/lib/domain/schemas.ts");
const [catalog, config, reports] = await Promise.all([
  readFile(catalogPath, "utf8").then(JSON.parse).then((value) => contentCatalogSchema.parse(value)),
  readFile(configPath, "utf8").then(JSON.parse).then((value) => monitoringConfigSchema.parse(value)),
  readFile(reportsPath, "utf8").then(JSON.parse).then((value) => monitoringReportsSchema.parse(value)),
]);
const observedAt = argumentValue("--observed-at") ?? new Date().toISOString();
isoInstantSchema.parse(observedAt);

const sourceIds = new Set(catalog.sources.map((source) => source.id));
const claimIds = new Set(catalog.claims.map((claim) => claim.id));
for (const check of config.fragmentChecks) {
  if (!sourceIds.has(check.sourceId)) throw new Error(`Unknown monitor source: ${check.sourceId}`);
  for (const claimId of check.claimIds) {
    if (!claimIds.has(claimId)) throw new Error(`Unknown monitor claim: ${claimId}`);
  }
}

const policy = {
  fetcherVersion: config.fetcherVersion,
  normalizerVersion: config.normalizerVersion,
  timeoutMs: config.timeoutMs,
  maximumResponseBytes: config.maximumResponseBytes,
  maximumRedirects: config.maximumRedirects,
};
const startedAt = new Date().toISOString();
const observations = await mapWithConcurrency(catalog.sources, 3, async (source) => {
  const checks = config.fragmentChecks.filter((check) => check.sourceId === source.id);
  return fetchOfficialSource({ source, checks, policy, observedAt });
});
const completedAt = new Date().toISOString();
const counts = observations.reduce((summary, observation) => {
  summary[observation.status] = (summary[observation.status] ?? 0) + 1;
  return summary;
}, { reachable: 0, unavailable: 0, blocked: 0, parse_failed: 0 });
const fragmentCounts = observations.flatMap((observation) => observation.fragmentChecks).reduce((summary, check) => {
  summary[check.status] = (summary[check.status] ?? 0) + 1;
  return summary;
}, { matched_unattested: 0, exact_match: 0, missing: 0, ambiguous: 0, not_evaluated: 0 });
const run = monitoringRunSchema.parse({
  schemaVersion: 2,
  id: `monitor.${observedAt.replace(/[^0-9]/g, "").slice(0, 17)}.${sha256(`${catalog.releaseId}:${observedAt}`).slice(0, 12)}`,
  mode: "evidence_acquisition",
  complete: observations.length === catalog.sources.length,
  eligibleForFreshnessRenewal: false,
  catalogReleaseId: catalog.releaseId,
  policyVersion: config.policyVersion,
  fetcherVersion: config.fetcherVersion,
  normalizerVersion: config.normalizerVersion,
  startedAt,
  completedAt,
  observedAt,
  summary: { ...counts, fragments: fragmentCounts },
  observations,
});
await vite.close();

if (process.argv.includes("--dry-run")) {
  process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
} else {
  if (reports.runs.some((existing) => existing.id === run.id)) {
    throw new Error(`Monitor run already exists: ${run.id}`);
  }
  const next = { ...reports, runs: [...reports.runs, run] };
  monitoringReportsSchema.parse(next);
  const temporaryPath = `${reportsPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporaryPath, reportsPath);
  process.stdout.write(
    `Recorded evidence-acquisition run ${run.id}: ${counts.reachable} reachable, ${counts.unavailable} unavailable, ${counts.blocked} blocked, ${counts.parse_failed} parse failures. Run the evaluator to derive claim decisions.\n`,
  );
}
