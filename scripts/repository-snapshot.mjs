import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const contentPath = (name) => fileURLToPath(new URL(`../content/${name}`, import.meta.url));

const [catalog, monitoringConfig, evidenceContracts, evidenceDecisions] = await Promise.all([
  readFile(contentPath("catalog.json"), "utf8").then(JSON.parse),
  readFile(contentPath("monitoring-config.json"), "utf8").then(JSON.parse),
  readFile(contentPath("evidence-contracts.json"), "utf8").then(JSON.parse),
  readFile(contentPath("evidence-decisions.json"), "utf8").then(JSON.parse),
]);

const currentRun = [...evidenceDecisions.runs].reverse().find(
  (run) => run.schemaVersion === 2
    && run.mode === "authoritative_automation"
    && run.eligibleForActions
    && run.catalogReleaseId === catalog.releaseId,
);
const decisionStates = (currentRun?.decisions ?? []).reduce((counts, decision) => {
  counts.set(decision.state, (counts.get(decision.state) ?? 0) + 1);
  return counts;
}, new Map());
const formattedStates = [...decisionStates.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([state, count]) => `${state}=${count}`)
  .join(", ") || "none";
const assetDirectory = fileURLToPath(new URL("../dist/client/assets/", import.meta.url));
const homeFeatureAsset = await readdir(assetDirectory)
  .then((files) => files.find((file) => /^beacons-app-.*\.js$/.test(file)) ?? null)
  .catch(() => null);
const homeFeatureSize = homeFeatureAsset
  ? await readFile(new URL(`../dist/client/assets/${homeFeatureAsset}`, import.meta.url)).then(
    (asset) => `homeFeature=${asset.length}B minified ${gzipSync(asset, { level: 9 }).length}B gzip`,
  )
  : "homeFeature=unavailable (run npm run build first)";

process.stdout.write([
  `Repository snapshot for ${catalog.releaseId}`,
  `places=${catalog.places.length} routes=${catalog.routes.length} claims=${catalog.claims.length}`,
  `sources=${catalog.sources.length} contracts=${evidenceContracts.contracts.length} costObservations=${catalog.costObservations.length}`,
  `fragmentChecks=${monitoringConfig.fragmentChecks.length} decisionStates=${formattedStates}`,
  `currentAutomationRun=${currentRun?.id ?? "none"}`,
  homeFeatureSize,
].join("\n") + "\n");
