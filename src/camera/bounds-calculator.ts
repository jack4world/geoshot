import type { BBox } from "../types/index.js";

export interface CameraParams {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bounds: BBox;
  padding: number;
}

export function calculateCamera(
  bounds: BBox,
  width: number,
  height: number,
  padding: number
): CameraParams {
  const [west, south, east, north] = bounds;

  const center: [number, number] = [
    (west + east) / 2,
    (south + north) / 2,
  ];

  // Estimate zoom level from bounds and viewport size
  const lngSpan = east - west;
  const latSpan = north - south;

  const effectiveWidth = width - padding * 2;
  const effectiveHeight = height - padding * 2;

  // Calculate zoom based on how many tiles we need to cover the area
  const lngZoom = lngSpan > 0
    ? Math.log2((360 * effectiveWidth) / (256 * lngSpan))
    : 18;
  const latZoom = latSpan > 0
    ? Math.log2((180 * effectiveHeight) / (256 * latSpan))
    : 18;

  const zoom = Math.min(lngZoom, latZoom, 18);

  return {
    center,
    zoom: Math.max(0, Math.floor(zoom * 10) / 10), // round down to 1 decimal
    bounds,
    padding,
  };
}
