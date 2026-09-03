# Map data provenance

The local candidate map uses `world-atlas` 2.0.2 `countries-50m.json`, a
TopoJSON redistribution of Natural Earth 4.1.0 Admin 0 country boundaries at
1:50m scale. Natural Earth places its vector map data in the public domain;
`world-atlas`, `topojson-client`, and `d3-geo` use ISC licenses.

- Natural Earth: https://www.naturalearthdata.com/
- Redistribution: https://github.com/topojson/world-atlas
- Projection/rendering: https://d3js.org/d3-geo

The geometry is bundled with the application. Opening the map makes no map-tile
or geolocation request. Country outlines are orientation context only: they do
not determine route eligibility, legal jurisdiction, territorial recognition,
or evidence status. All destination and origin markers use the same Mercator
projection as the basemap.
