import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { parseTrackFile } from "../src/core/parser.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

describe("parser", () => {
  it("should parse a GPX file", async () => {
    const result = await parseTrackFile(join(FIXTURES, "sample.gpx"));
    expect(result.format).toBe("gpx");
    expect(result.trackCount).toBe(1);
    expect(result.pointCount).toBe(20);
    expect(result.name).toBe("Test Trail Run");
    expect(result.geojson.features).toHaveLength(1);
    expect(result.geojson.features[0].geometry.type).toBe("LineString");
  });

  it("should parse a KML file", async () => {
    const result = await parseTrackFile(join(FIXTURES, "sample.kml"));
    expect(result.format).toBe("kml");
    expect(result.trackCount).toBe(1);
    expect(result.pointCount).toBe(10);
    expect(result.geojson.features).toHaveLength(1);
  });

  it("should reject unsupported formats", async () => {
    await expect(
      parseTrackFile(join(FIXTURES, "nonexistent.txt"))
    ).rejects.toThrow("Unsupported file format");
  });
});
