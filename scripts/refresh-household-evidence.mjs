import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";
import { fetchOfficialSource } from "./lib/evidence-monitor-core.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const mobilityPath = fileURLToPath(new URL("../content/household-mobility.json", import.meta.url));
const shouldWrite = process.argv.includes("--write");
const observedAt = new Date().toISOString();
const reviewAfter = new Date(new Date(observedAt).valueOf() + 14 * 24 * 60 * 60 * 1000).toISOString();

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

const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

try {
  const { householdMobilityCatalogSchema } = await vite.ssrLoadModule("/lib/domain/household-eligibility.ts");
  const mobility = householdMobilityCatalogSchema.parse(JSON.parse(await readFile(mobilityPath, "utf8")));
  const jobs = mobility.rules.flatMap((rule) => rule.sources.map((source, sourceIndex) => ({ rule, source, sourceIndex })));
  const observationCache = new Map();
  const policy = {
    fetcherVersion: "household-official-source-v1",
    normalizerVersion: "visible-text-v1",
    timeoutMs: 30_000,
    maximumResponseBytes: 10 * 1024 * 1024,
    maximumRedirects: 5,
  };
  const results = await mapWithConcurrency(jobs, 3, async ({ rule, source, sourceIndex }) => {
    if (!source.monitoring) return { placeId: rule.placeId, sourceId: source.id, passed: false, reason: "monitoring_not_configured" };
    const isText = source.monitoring.strategy === "exact_text";
    const checks = isText ? [{
      id: `household.${rule.placeId.replace(/^place\./, "")}.${sourceIndex}`,
      claimIds: [rule.placeId],
      requiredText: source.monitoring.requiredText,
      maximumSpanCharacters: source.monitoring.maximumSpanCharacters,
    }] : [];
    const cacheKey = JSON.stringify({ url: source.url, monitoring: source.monitoring });
    let observationPromise = observationCache.get(cacheKey);
    if (!observationPromise) {
      observationPromise = fetchOfficialSource({
        source: { ...source, expectedContentType: "html", allowedRedirectHosts: [] },
        checks,
        policy,
        observedAt,
      });
      observationCache.set(cacheKey, observationPromise);
    }
    const observation = await observationPromise;
    if (observation.status !== "reachable") {
      return { placeId: rule.placeId, sourceId: source.id, passed: false, reason: observation.reasonCode };
    }
    if (isText) {
      const fragment = observation.fragmentChecks[0];
      return { placeId: rule.placeId, sourceId: source.id, passed: fragment?.status === "exact_match", reason: fragment?.reasonCode ?? "fragment_missing" };
    }
    return {
      placeId: rule.placeId,
      sourceId: source.id,
      passed: observation.rawSha256 === source.monitoring.expectedSha256,
      reason: observation.rawSha256 === source.monitoring.expectedSha256 ? "raw_fingerprint_match" : "raw_fingerprint_changed",
    };
  });

  const failed = results.filter((result) => !result.passed);
  for (const result of results) {
    process.stdout.write(`${result.passed ? "PASS" : "FAIL"} ${result.placeId} ${result.sourceId}: ${result.reason}\n`);
  }
  const renewedPlaceIds = new Set(mobility.rules.filter((rule) => {
    const ruleResults = results.filter((result) => result.placeId === rule.placeId);
    return ruleResults.length > 0 && ruleResults.every((result) => result.passed);
  }).map((rule) => rule.placeId));
  const next = householdMobilityCatalogSchema.parse({
    ...mobility,
    rules: mobility.rules.map((rule) => renewedPlaceIds.has(rule.placeId)
      ? { ...rule, reviewedAt: observedAt, reviewAfter }
      : rule),
  });
  if (shouldWrite) {
    const temporaryPath = `${mobilityPath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    await rename(temporaryPath, mobilityPath);
  }
  process.stdout.write(`${shouldWrite ? "Renewed" : "Would renew"} ${renewedPlaceIds.size}/${next.rules.length} household evidence assessments through ${reviewAfter}; ${failed.length} failed source check(s) remain unrenewed.\n`);
  if (failed.length && process.argv.includes("--strict")) {
    throw new Error(`Household evidence renewal withheld for ${failed.length} source(s)`);
  }
} finally {
  await vite.close();
}
