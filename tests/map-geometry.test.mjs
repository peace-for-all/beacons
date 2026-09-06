import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, logLevel: "silent", root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false } });
const { createRegionalMap, MAP_DATASET, MOSCOW_COORDINATES, SAINT_PETERSBURG_COORDINATES } = await vite.ssrLoadModule("/lib/map/world-map.ts");
const { INITIAL_MAP_CAMERA, cameraPoint, ensurePointVisible, panCamera, pinchCamera, zoomCameraAt } = await vite.ssrLoadModule("/lib/map/map-camera.ts");
const { layoutMarkerLabels } = await vite.ssrLoadModule("/lib/map/marker-layout.ts");
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
  assert.notEqual(map.routePath([77.209, 28.6139]), map.routePath([77.209, 28.6139], SAINT_PETERSBURG_COORDINATES));
  for (const value of [map.landPath, map.borderPath, map.graticulePath]) assert.doesNotMatch(value, /NaN|Infinity/);
});

test("map provenance and implementation remain explicit", async () => {
  assert.equal(MAP_DATASET.scale, "1:110m");
  assert.equal(MAP_DATASET.redistributedBy, "world-atlas");
  assert.match(MAP_DATASET.source, /^https:\/\/www\.naturalearthdata\.com\/$/);

  const source = await readFile(new URL("../components/beacons/beacon-map.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /M92 111 C165|left:\s*38%|preserveAspectRatio="none"/);
  assert.match(source, /createRegionalMap/);
  assert.match(source, /ResizeObserver/);
  assert.match(source, /onCameraChange\(\(current\) => panCamera/);
  assert.match(source, /detail-open/);
});

test("camera zoom and pan remain finite and within the visible frame", () => {
  const initialPan = panCamera(INITIAL_MAP_CAMERA, 48, -32, 760, 620);
  assert.deepEqual(initialPan, { scale: 1, x: 48, y: -32 });
  const boundedInitialPan = panCamera(INITIAL_MAP_CAMERA, 9_000, -9_000, 760, 620);
  assert.equal(boundedInitialPan.scale, 1);
  assert.ok(Math.abs(boundedInitialPan.x - 60.8) < 1e-9);
  assert.ok(Math.abs(boundedInitialPan.y + 49.6) < 1e-9);
  const zoomed = zoomCameraAt(INITIAL_MAP_CAMERA, 8, { x: 760, y: 620 }, 760, 620);
  assert.equal(zoomed.scale, 4);
  assert.ok(zoomed.x <= 1140 && zoomed.x >= -1140);
  assert.ok(zoomed.y <= 930 && zoomed.y >= -930);
  const panned = panCamera(zoomed, 9_000, -9_000, 760, 620);
  assert.equal(panned.x, 1140);
  assert.equal(panned.y, -930);
});

test("two-pointer pinch zooms the map around the gesture and follows its center", () => {
  const zoomed = pinchCamera(INITIAL_MAP_CAMERA, { distance: 100, center: { x: 160, y: 284 } }, { distance: 200, center: { x: 180, y: 294 } }, 320, 568);
  assert.deepEqual(zoomed, { scale: 2, x: 20, y: 10 });
  const returned = pinchCamera(zoomed, { distance: 200, center: { x: 180, y: 294 } }, { distance: 100, center: { x: 160, y: 284 } }, 320, 568);
  assert.deepEqual(returned, INITIAL_MAP_CAMERA);
});

test("marker collision layout displaces or suppresses labels but never geographic anchors", () => {
  const anchors = [
    { id: "yerevan", x: 390, y: 360 },
    { id: "tbilisi", x: 394, y: 364 },
    { id: "belgrade", x: 180, y: 260 },
  ];
  const first = layoutMarkerLabels(anchors, 760, 620);
  const second = layoutMarkerLabels(anchors, 760, 620);
  assert.deepEqual(first, second);
  assert.deepEqual(first.map(({ id, x, y }) => ({ id, x, y })), anchors);
  assert.ok(first.some((item) => item.leader || !item.visible));
  for (const item of first) {
    assert.ok(item.labelX >= 0 && item.labelX <= 584);
    assert.ok(item.labelY >= 0 && item.labelY <= 578);
  }
});

test("screen anchors follow the camera and focus recovery stays finite", () => {
  const point = cameraPoint({ x: 20, y: 30 }, { scale: 2, x: 0, y: 0 }, 320, 568);
  assert.deepEqual(point, { x: -120, y: -224 });
  const recovered = ensurePointVisible({ scale: 2, x: 0, y: 0 }, { x: 20, y: 30 }, 320, 568);
  assert.ok(Number.isFinite(recovered.x) && Number.isFinite(recovered.y));
  const labels = layoutMarkerLabels([{ id: "a", x: 22, y: 22 }, { id: "b", x: 24, y: 24 }], 320, 568, { labelWidth: 118, obstacles: [{ left: 256, top: 0, width: 64, height: 178 }] });
  assert.ok(labels.every((label) => typeof label.visible === "boolean"));
});

test("phone labels stay padded from edges and hide when their marker is offscreen", () => {
  const anchors = [{ id: "edge", x: 24, y: 210 }, { id: "nearby", x: 72, y: 245 }, { id: "clear", x: 230, y: 310 }];
  const labels = layoutMarkerLabels(anchors, 320, 568, { labelWidth: 118, edgePadding: 12 });
  for (const label of labels.filter((item) => item.visible)) {
    assert.ok(label.labelX >= 12 && label.labelX <= 190);
    assert.ok(label.labelY >= 12 && label.labelY <= 514);
  }
  const offscreen = layoutMarkerLabels([{ id: "outside", x: -3, y: 210 }], 320, 568, { labelWidth: 118, edgePadding: 12 });
  assert.equal(offscreen[0].visible, false);
});
