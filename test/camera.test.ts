import { describe, it, expect } from "vitest";
import { calculateCamera } from "../src/camera/bounds-calculator.js";
import type { BBox } from "../src/types/index.js";

describe("bounds-calculator", () => {
  it("should compute center from bounds", () => {
    const bounds: BBox = [-122.34, 47.60, -122.30, 47.62];
    const result = calculateCamera(bounds, 1920, 1080, 60);

    expect(result.center[0]).toBeCloseTo(-122.32, 2);
    expect(result.center[1]).toBeCloseTo(47.61, 2);
    expect(result.zoom).toBeGreaterThan(0);
    expect(result.zoom).toBeLessThanOrEqual(18);
    expect(result.padding).toBe(60);
  });

  it("should compute reasonable zoom for city-scale bounds", () => {
    const bounds: BBox = [-122.5, 47.5, -122.2, 47.7];
    const result = calculateCamera(bounds, 1920, 1080, 60);

    expect(result.zoom).toBeGreaterThan(8);
    expect(result.zoom).toBeLessThan(16);
  });
});
