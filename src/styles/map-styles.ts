import type { MapStyle } from "../types/index.js";

export interface TileStyle {
  name: string;
  url: string;
  type: "raster" | "vector";
  attribution: string;
}

// Vector tile styles (OpenFreeMap — free, no API key)
const VECTOR_STYLES: Record<string, TileStyle> = {
  liberty: {
    name: "OpenFreeMap Liberty",
    url: "https://tiles.openfreemap.org/styles/liberty",
    type: "vector",
    attribution: "&copy; OpenFreeMap &copy; OpenMapTiles &copy; OpenStreetMap",
  },
  bright: {
    name: "OpenFreeMap Bright",
    url: "https://tiles.openfreemap.org/styles/bright",
    type: "vector",
    attribution: "&copy; OpenFreeMap &copy; OpenMapTiles &copy; OpenStreetMap",
  },
  positron: {
    name: "OpenFreeMap Positron",
    url: "https://tiles.openfreemap.org/styles/positron",
    type: "vector",
    attribution: "&copy; OpenFreeMap &copy; OpenMapTiles &copy; OpenStreetMap",
  },
};

// Raster tile styles (free CDN tiles)
const RASTER_STYLES: Record<string, TileStyle> = {
  outdoor: {
    name: "CartoDB Voyager",
    url: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
    type: "raster",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  light: {
    name: "CartoDB Positron",
    url: "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
    type: "raster",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  dark: {
    name: "CartoDB Dark Matter",
    url: "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
    type: "raster",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  topo: {
    name: "OpenTopoMap",
    url: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
    type: "raster",
    attribution: "&copy; OpenStreetMap contributors, SRTM &copy; OpenTopoMap",
  },
  terrain: {
    name: "ESRI World Shaded Relief",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
    type: "raster",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA",
  },
};

export function getMapStyleConfig(
  style: MapStyle,
  mapboxToken?: string
): { style: object | string } {
  // Mapbox satellite (requires token)
  if (style === "satellite") {
    if (!mapboxToken) {
      throw new Error(
        "Satellite style requires --mapbox-token. Free alternatives: topo, terrain, liberty, bright, positron, outdoor, dark, light"
      );
    }
    return {
      style: `mapbox://styles/mapbox/satellite-streets-v12`,
    };
  }

  // OpenFreeMap vector styles — pass URL directly as style (MapLibre loads the JSON)
  if (style in VECTOR_STYLES) {
    return {
      style: VECTOR_STYLES[style].url,
    };
  }

  // Raster tile styles
  const tile = RASTER_STYLES[style];
  if (!tile) {
    throw new Error(`Unknown map style: ${style}. Available: topo, terrain, liberty, bright, positron, outdoor, dark, light, satellite`);
  }

  return {
    style: {
      version: 8,
      sources: {
        basemap: {
          type: "raster",
          tiles: [tile.url],
          tileSize: 256,
          attribution: tile.attribution,
        },
      },
      layers: [
        {
          id: "basemap",
          type: "raster",
          source: "basemap",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  };
}
