import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const [routeId, changeId, nextReleaseId, operatorId, reasonEn, reasonRu] = process.argv.slice(2);
if (![routeId, changeId, nextReleaseId, operatorId, reasonEn, reasonRu].every(Boolean)) {
  process.stderr.write("Usage: npm run route:withdraw -- ROUTE_ID CHANGE_ID NEXT_RELEASE_ID OPERATOR_ID REASON_EN REASON_RU\n");
  process.exit(2);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const catalogPath = fileURLToPath(new URL("../content/catalog.json", import.meta.url));
const temporaryPath = `${catalogPath}.withdrawal.tmp`;
const vite = await createServer({ appType: "custom", configFile: false, logLevel: "silent", root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false } });

try {
  const { contentCatalogSchema } = await vite.ssrLoadModule("/lib/domain/schemas.ts");
  const { withdrawRoute } = await vite.ssrLoadModule("/lib/domain/catalog-operations.ts");
  const catalog = contentCatalogSchema.parse(JSON.parse(await readFile(catalogPath, "utf8")));
  const next = withdrawRoute(catalog, { routeId, changeId, nextReleaseId, operatorId, changedAt: new Date().toISOString(), reason: { en: reasonEn, ru: reasonRu } });
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, { flag: "wx" });
  await rename(temporaryPath, catalogPath);
  process.stdout.write(`Withdrew ${routeId} in release ${nextReleaseId}. Claims and sources were preserved.\n`);
} finally {
  await vite.close();
}
