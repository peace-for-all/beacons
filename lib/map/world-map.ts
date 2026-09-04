import { geoGraticule10, geoMercator, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { MultiPoint } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Objects, Topology } from "topojson-specification";
import worldAtlas from "world-atlas/countries-110m.json";

type WorldObjects = Objects & {
  countries: GeometryCollection;
  land: GeometryCollection;
};

const topology = worldAtlas as unknown as Topology<WorldObjects>;
const land = feature(topology, topology.objects.land) as GeoPermissibleObjects;
const borders = mesh(topology, topology.objects.countries, (a, b) => a !== b);

const regionalFrame: MultiPoint = {
  type: "MultiPoint",
  coordinates: [[-16, 16], [109, 71]],
};

export const MOSCOW_COORDINATES: [number, number] = [37.6173, 55.7558];
export const SAINT_PETERSBURG_COORDINATES: [number, number] = [30.3351, 59.9343];

export const MAP_DATASET = {
  name: "Natural Earth Admin 0 countries",
  scale: "1:110m",
  redistributedBy: "world-atlas",
  version: "2.0.2 / Natural Earth 4.1.0",
  source: "https://www.naturalearthdata.com/",
} as const;

export type MapPoint = { x: number; y: number };

export function createRegionalMap(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("map_dimensions_invalid");
  }

  const projection = geoMercator()
    .fitExtent([[30, 28], [Math.max(31, width - 30), Math.max(29, height - 72)]], regionalFrame)
    .clipExtent([[0, 0], [width, height]]);
  const path = geoPath(projection);

  function project(coordinates: [number, number]): MapPoint {
    const point = projection(coordinates);
    if (!point || !point.every(Number.isFinite)) throw new Error("map_projection_failed");
    return { x: point[0], y: point[1] };
  }

  function routePath(destination: [number, number], origin: [number, number] = MOSCOW_COORDINATES) {
    return path({ type: "LineString", coordinates: [origin, destination] }) ?? "";
  }

  return {
    landPath: path(land) ?? "",
    borderPath: path(borders) ?? "",
    graticulePath: path(geoGraticule10()) ?? "",
    project,
    routePath,
  };
}
