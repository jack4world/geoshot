import chroma from "chroma-js";
import type { TrackPoint, ColorByMetric, ColorRamp } from "../types/index.js";

const RAMPS: Record<ColorRamp, string[]> = {
  turbo: ["#30123b", "#4662d7", "#36aaf9", "#1ae4b6", "#72fe5e", "#c8ef34", "#faba39", "#f66b19", "#ca2a04", "#7a0403"],
  viridis: ["#440154", "#482777", "#3e4989", "#31688e", "#26828e", "#1f9e89", "#6cce5a", "#b6de2b", "#fee825"],
  plasma: ["#0d0887", "#4b03a1", "#7d03a8", "#a82296", "#cb4679", "#e56b5d", "#f89441", "#fdc328", "#f0f921"],
  inferno: ["#000004", "#1b0c41", "#4a0c6b", "#781c6d", "#a52c60", "#cf4446", "#ed6925", "#fb9b06", "#f7d13d", "#fcffa4"],
  rdylgn: ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"],
};

export interface ColorMapping {
  colors: string[];
  stops: number[]; // normalized 0-1
  expression: unknown; // MapLibre line-gradient expression
}

export function buildColorMapping(
  points: TrackPoint[],
  metric: ColorByMetric,
  rampName: ColorRamp,
  solidColor?: string
): ColorMapping {
  if (metric === "none" || points.length === 0) {
    return {
      colors: [solidColor || "#3b82f6"],
      stops: [0],
      expression: null,
    };
  }

  const values = points.map((p) => getMetricValue(p, metric));
  const defined = values.filter((v): v is number => v !== undefined);

  if (defined.length === 0) {
    return {
      colors: ["#3b82f6"],
      stops: [0],
      expression: null,
    };
  }

  const min = Math.min(...defined);
  const max = Math.max(...defined);
  const range = max - min || 1;

  const rampColors = RAMPS[rampName];
  const scale = chroma.scale(rampColors).domain([min, max]);

  // Build per-point colors and normalized stops based on distance
  const totalDistance = points[points.length - 1].distanceFromStart || 1;
  const colors: string[] = [];
  const stops: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const val = values[i] ?? min;
    const color = scale(val).hex();
    const stop = points[i].distanceFromStart / totalDistance;
    colors.push(color);
    stops.push(stop);
  }

  // Build MapLibre line-gradient expression
  // Keep stops count low (max 64) for reliable rendering in headless WebGL
  const maxStops = 64;
  const step = Math.max(1, Math.floor(points.length / maxStops));
  const gradientStops: [number, string][] = [];

  for (let i = 0; i < points.length; i += step) {
    gradientStops.push([stops[i], colors[i]]);
  }
  // Always include last point
  if (gradientStops[gradientStops.length - 1][0] !== stops[stops.length - 1]) {
    gradientStops.push([stops[stops.length - 1], colors[colors.length - 1]]);
  }

  // Ensure first stop starts at 0
  if (gradientStops[0][0] !== 0) {
    gradientStops.unshift([0, gradientStops[0][1]]);
  }

  const expression: unknown = [
    "interpolate",
    ["linear"],
    ["line-progress"],
    ...gradientStops.flatMap(([stop, color]) => [stop, color]),
  ];

  return { colors, stops, expression };
}

function getMetricValue(
  point: TrackPoint,
  metric: ColorByMetric
): number | undefined {
  switch (metric) {
    case "elevation":
      return point.ele;
    case "speed":
      return point.speed;
    case "gradient":
      return point.gradient;
    case "distance":
      return point.distanceFromStart;
    default:
      return undefined;
  }
}
