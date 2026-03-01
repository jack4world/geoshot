import type { ColorMapping } from "../core/color-mapper.js";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export interface TrackLayerConfig {
  source: {
    type: "geojson";
    data: FeatureCollection | Feature;
    lineMetrics: boolean;
  };
  layer: object;
  markers?: {
    start: { lon: number; lat: number };
    end: { lon: number; lat: number };
  };
}

export function buildTrackLayer(
  geojson: FeatureCollection,
  colorMapping: ColorMapping,
  trackWidth: number,
  showMarkers: boolean
): TrackLayerConfig {
  const hasGradient = colorMapping.expression !== null;

  const paint: Record<string, unknown> = {
    "line-width": trackWidth,
    "line-opacity": 0.9,
  };

  if (hasGradient) {
    paint["line-gradient"] = colorMapping.expression;
  } else {
    paint["line-color"] = colorMapping.colors[0] ?? "#3b82f6";
  }

  const layer = {
    id: "track",
    type: "line",
    source: "track",
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint,
  };

  // For line-gradient, use a single Feature (not FeatureCollection)
  // line-gradient works best with individual features
  const data: FeatureCollection | Feature =
    hasGradient && geojson.features.length === 1
      ? geojson.features[0]
      : geojson;

  const source = {
    type: "geojson" as const,
    data,
    lineMetrics: hasGradient,
  };

  let markers: TrackLayerConfig["markers"] | undefined;
  if (showMarkers) {
    // Extract first and last coordinates from all features
    const allCoords = extractAllCoordinates(geojson);
    if (allCoords.length > 0) {
      markers = {
        start: { lon: allCoords[0][0], lat: allCoords[0][1] },
        end: {
          lon: allCoords[allCoords.length - 1][0],
          lat: allCoords[allCoords.length - 1][1],
        },
      };
    }
  }

  return { source, layer, markers };
}

function extractAllCoordinates(geojson: FeatureCollection): number[][] {
  const coords: number[][] = [];
  for (const feature of geojson.features) {
    if (feature.geometry.type === "LineString") {
      coords.push(...feature.geometry.coordinates);
    } else if (feature.geometry.type === "MultiLineString") {
      for (const line of feature.geometry.coordinates) {
        coords.push(...line);
      }
    }
  }
  return coords;
}
