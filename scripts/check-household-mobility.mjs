import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, logLevel: "silent", root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false } });
try {
  const { householdMobilityCatalogSchema } = await vite.ssrLoadModule("/lib/domain/household-eligibility.ts");
  const { contentCatalogSchema } = await vite.ssrLoadModule("/lib/domain/schemas.ts");
  const mobility = householdMobilityCatalogSchema.parse(JSON.parse(await readFile(new URL("../content/household-mobility.json", import.meta.url), "utf8")));
  const catalog = contentCatalogSchema.parse(JSON.parse(await readFile(new URL("../content/catalog.json", import.meta.url), "utf8")));
  const placeIds = new Set(catalog.places.map((place) => place.id));
  const ruleIds = new Set(mobility.rules.map((rule) => rule.placeId));
  const unknown = [...ruleIds].filter((id) => !placeIds.has(id));
  const missing = [...placeIds].filter((id) => !ruleIds.has(id));
  if (unknown.length || missing.length) throw new Error(`Household mobility coverage mismatch; unknown: ${unknown.join(", ") || "none"}; missing: ${missing.join(", ") || "none"}`);
  const asOf = new Date();
  const overdue = mobility.rules.filter((rule) => asOf > new Date(rule.reviewAfter));
  if (overdue.length) throw new Error(`Household mobility review overdue: ${overdue.map((rule) => rule.placeId).join(", ")}`);
  const unmonitored = mobility.rules.flatMap((rule) => rule.sources.filter((source) => !source.monitoring).map((source) => `${rule.placeId}:${source.id}`));
  if (unmonitored.length) throw new Error(`Household mobility sources without automated checks: ${unmonitored.join(", ")}`);
  process.stdout.write(`Validated ${mobility.rules.length} household mobility rules; ${mobility.rules.filter((rule) => rule.dogCount.status === "supported").length} have current count-specific dog evidence and every source has an automated check.\n`);
} finally {
  await vite.close();
}
