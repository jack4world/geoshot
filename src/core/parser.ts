import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { JSDOM } from "jsdom";
import { gpx, kml } from "@tmcw/togeojson";
import type { Feature, FeatureCollection, Geometry, LineString } from "geojson";
import type { ParsedTrack } from "../types/index.js";

export async function parseTrackFile(filePath: string): Promise<ParsedTrack> {
  const ext = extname(filePath).toLowerCase();
  if (ext !== ".gpx" && ext !== ".kml") {
    throw new Error(`Unsupported file format: ${ext}. Use .gpx or .kml`);
  }

  const content = await readFile(filePath, "utf-8");
  const dom = new JSDOM(content, { contentType: "text/xml" });
  const doc = dom.window.document;

  const format = ext === ".gpx" ? "gpx" : "kml";
  const raw = format === "gpx" ? gpx(doc) : kml(doc);

  // Filter to LineString features (tracks/routes), excluding null geometries
  const trackFeatures = raw.features.filter(
    (f): f is Feature<Geometry> =>
      f.geometry !== null &&
      (f.geometry.type === "LineString" ||
       f.geometry.type === "MultiLineString")
  );

  if (trackFeatures.length === 0) {
    throw new Error("No tracks or routes found in file");
  }

  // Count total points
  let pointCount = 0;
  for (const feature of trackFeatures) {
    if (feature.geometry.type === "LineString") {
      pointCount += (feature.geometry as LineString).coordinates.length;
    } else if (feature.geometry.type === "MultiLineString") {
      for (const line of feature.geometry.coordinates) {
        pointCount += line.length;
      }
    }
  }

  // Extract name from first track
  const name = trackFeatures[0]?.properties?.name ?? undefined;

  return {
    geojson: {
      type: "FeatureCollection",
      features: trackFeatures,
    },
    format,
    name,
    trackCount: trackFeatures.length,
    pointCount,
  };
}
