import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, logLevel: "silent", root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false } });
const { createRegionalMap, MAP_DATASET, MOSCOW_COORDINATES } = await vite.ssrLoadModule("/lib/map/world-map.ts");
const { INITIAL_MAP_CAMERA, panCamera, zoomCameraAt } = await vite.ssrLoadModule("/lib/map/map-camera.ts");
after(async () => vite.close());

test("Natural Earth geometry renders with a single projection contract", () => {
  const map = createRegionalMap(760, 620);
  const belgrade = map.project([20.4489, 44.7866]);
  const delhi = map.project([77.209, 28.6139]);
  const moscow = map.project(MOSCOW_COORDINATES);

  for (const point of [belgrade, delhi, moscow]) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(point.x >= 0 && point.x <= 760, `${point.x} outside width`);
    assert.ok(point.y >= 0 && point.y <= 620, `${point.y} outside height`);
  }
  assert.ok(belgrade.x < delhi.x);
  assert.ok(moscow.y < belgrade.y && moscow.y < delhi.y);
  assert.ok(map.landPath.length > 10_000);
  assert.ok(map.borderPath.length > 10_000);
  assert.ok(map.graticulePath.length > 100);
  assert.ok(map.routePath([77.209, 28.6139]).length > 20);
  for (const value of [map.landPath, map.borderPath, map.graticulePath]) assert.doesNotMatch(value, /NaN|Infinity/);
});

test("map provenance and implementation remain explicit", async () => {
  assert.equal(MAP_DATASET.scale, "1:50m");
  assert.equal(MAP_DATASET.redistributedBy, "world-atlas");
  assert.match(MAP_DATASET.source, /^https:\/\/www\.naturalearthdata\.com\/$/);

  const source = await readFile(new URL("../components/beacons/beacon-map.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /M92 111 C165|left:\s*38%|preserveAspectRatio="none"/);
  assert.match(source, /createRegionalMap/);
  assert.match(source, /ResizeObserver/);
});

test("camera zoom and pan remain finite and within the visible frame", () => {
  const zoomed = zoomCameraAt(INITIAL_MAP_CAMERA, 8, { x: 760, y: 620 }, 760, 620);
  assert.equal(zoomed.scale, 4);
  assert.ok(zoomed.x <= 1140 && zoomed.x >= -1140);
  assert.ok(zoomed.y <= 930 && zoomed.y >= -930);
  const panned = panCamera(zoomed, 9_000, -9_000, 760, 620);
  assert.equal(panned.x, 1140);
  assert.equal(panned.y, -930);
});
