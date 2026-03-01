import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { parseTrackFile } from "../src/core/parser.js";
import { analyzeTrack } from "../src/core/track-analyzer.js";
import { buildColorMapping } from "../src/core/color-mapper.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

describe("color-mapper", () => {
  it("should generate color mapping for elevation", async () => {
    const parsed = await parseTrackFile(join(FIXTURES, "sample.gpx"));
    const analyzed = analyzeTrack(parsed.geojson);
    const result = buildColorMapping(analyzed.points, "elevation", "turbo");

    expect(result.colors.length).toBe(analyzed.points.length);
    expect(result.stops.length).toBe(analyzed.points.length);
    expect(result.expression).not.toBeNull();
    // Expression should be an interpolation array
    expect(Array.isArray(result.expression)).toBe(true);
    expect((result.expression as unknown[])[0]).toBe("interpolate");
  });

  it("should generate solid color for 'none' metric", async () => {
    const parsed = await parseTrackFile(join(FIXTURES, "sample.gpx"));
    const analyzed = analyzeTrack(parsed.geojson);
    const result = buildColorMapping(analyzed.points, "none", "turbo");

    expect(result.colors).toEqual(["#3b82f6"]);
    expect(result.expression).toBeNull();
  });

  it("should work with speed metric", async () => {
    const parsed = await parseTrackFile(join(FIXTURES, "sample.gpx"));
    const analyzed = analyzeTrack(parsed.geojson);
    const result = buildColorMapping(analyzed.points, "speed", "viridis");

    // Speed is available for most points (all except first)
    expect(result.colors.length).toBeGreaterThan(1);
    expect(result.expression).not.toBeNull();
  });
});
