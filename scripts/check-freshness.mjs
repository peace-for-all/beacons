import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const catalogPath = fileURLToPath(new URL("../content/catalog.json", import.meta.url));
const decisionsPath = fileURLToPath(new URL("../content/evidence-decisions.json", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

try {
  const { contentCatalogSchema, evidenceAutomationReportsSchema } = await vite.ssrLoadModule(
    "/lib/domain/schemas.ts",
  );
  const { evaluateRoutePublication } = await vite.ssrLoadModule(
    "/lib/domain/freshness.ts",
  );
  const { selectLatestActionEligibleAutomationRun } = await vite.ssrLoadModule(
    "/lib/domain/evidence-run-selection.ts",
  );
  const catalog = contentCatalogSchema.parse(
    JSON.parse(await readFile(catalogPath, "utf8")),
  );
  const reports = evidenceAutomationReportsSchema.parse(
    JSON.parse(await readFile(decisionsPath, "utf8")),
  );
  const automationRun = selectLatestActionEligibleAutomationRun(
    reports.runs,
    catalog.releaseId,
  );
  const claims = new Map(catalog.claims.map((claim) => [claim.id, claim]));
  const asOf = new Date().toISOString();
  const blocked = catalog.routes
    .filter((route) => route.publicationState === "published")
    .map((route) => ({
      route,
      result: evaluateRoutePublication({ route, claims, automationRun, catalogReleaseId: catalog.releaseId, asOf }),
    }))
    .filter(({ result }) => !result.canRemainPublished);

  if (blocked.length > 0) {
    for (const { route, result } of blocked) {
      process.stderr.write(
        `${route.id}: ${result.aggregateCondition}; blocking claims: ${result.blockingClaimIds.join(", ") || "none"}\n`,
      );
    }
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `Freshness gate passed for ${catalog.routes.filter((route) => route.publicationState === "published").length} published routes.\n`,
    );
  }
} finally {
  await vite.close();
}
