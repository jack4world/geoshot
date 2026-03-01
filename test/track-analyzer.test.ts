import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { parseTrackFile } from "../src/core/parser.js";
import { analyzeTrack } from "../src/core/track-analyzer.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

describe("track-analyzer", () => {
  it("should compute stats from GPX", async () => {
    const parsed = await parseTrackFile(join(FIXTURES, "sample.gpx"));
    const result = analyzeTrack(parsed.geojson);

    expect(result.stats.pointCount).toBe(20);
    expect(result.stats.distance).toBeGreaterThan(0);
    expect(result.stats.elevationGain).toBeGreaterThan(0);
    expect(result.stats.elevationLoss).toBeGreaterThan(0);
    expect(result.stats.elevationMin).toBe(50);
    expect(result.stats.elevationMax).toBe(120);
    expect(result.stats.bounds).toHaveLength(4);
    // Has time data
    expect(result.stats.duration).toBeGreaterThan(0);
    expect(result.stats.speedAvg).toBeGreaterThan(0);
    expect(result.stats.speedMax).toBeGreaterThan(0);
  });

  it("should compute stats from KML", async () => {
    const parsed = await parseTrackFile(join(FIXTURES, "sample.kml"));
    const result = analyzeTrack(parsed.geojson);

    expect(result.stats.pointCount).toBe(10);
    expect(result.stats.distance).toBeGreaterThan(0);
    expect(result.stats.elevationGain).toBeGreaterThan(0);
    // KML doesn't have time data
    expect(result.stats.duration).toBeUndefined();
  });

  it("should produce correct points array", async () => {
    const parsed = await parseTrackFile(join(FIXTURES, "sample.gpx"));
    const result = analyzeTrack(parsed.geojson);

    expect(result.points).toHaveLength(20);
    expect(result.points[0].distanceFromStart).toBe(0);
    expect(result.points[result.points.length - 1].distanceFromStart).toBeGreaterThan(0);
    // First point has no speed/gradient
    expect(result.points[0].speed).toBeUndefined();
    // Later points should have speed
    expect(result.points[5].speed).toBeGreaterThan(0);
  });
});
