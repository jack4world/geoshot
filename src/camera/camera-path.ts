import type { TrackPoint, CameraKeyframe, BBox } from "../types/index.js";

/**
 * Build a camera keyframe array for the 3-act video structure.
 *
 * Act 1 (intro ~15%): overview → zoom in to start point
 * Act 2 (fly ~70%):   camera follows track, progressive trail reveal
 * Act 3 (outro ~15%): zoom out back to overview with full track visible
 */
export function buildCameraPath(
  points: TrackPoint[],
  bounds: BBox,
  totalFrames: number,
  overviewZoom: number,
  options?: { terrain?: boolean },
): CameraKeyframe[] {
  if (points.length < 2) {
    return Array.from({ length: totalFrames }, () => ({
      center: [points[0]?.lon ?? 0, points[0]?.lat ?? 0] as [number, number],
      zoom: overviewZoom,
      bearing: 0,
      pitch: 0,
      progress: 0,
      phase: "fly" as const,
      distanceKm: 0,
      elevationM: points[0]?.ele ?? 0,
      speedKmh: 0,
    }));
  }

  // Frame allocation
  const introFrames = Math.round(totalFrames * 0.15);
  const outroFrames = Math.round(totalFrames * 0.15);
  const flyFrames = totalFrames - introFrames - outroFrames;

  // Overview camera
  const [west, south, east, north] = bounds;
  const overviewCenter: [number, number] = [(west + east) / 2, (south + north) / 2];

  // Fly zoom: higher than overview to show detail
  // With 3D terrain, zoom out more to prevent camera clipping into mountains
  const terrain = options?.terrain ?? false;
  const flyZoomOffset = terrain ? 1.5 : 2.5;
  const flyZoomMax = terrain ? 14.5 : 16;
  const flyPitch = terrain ? 55 : 60;
  const flyZoom = Math.min(overviewZoom + flyZoomOffset, flyZoomMax);

  // Pre-compute bearings with very aggressive smoothing
  // Use window proportional to point count (at least 10% of points)
  const rawBearings = computeBearings(points);
  const bearingWindow = Math.max(30, Math.floor(points.length * 0.15));
  const smoothBearings = smoothBearingArray(rawBearings, bearingWindow);

  // Pre-compute adaptive zoom (gentle variation)
  const adaptiveZooms = computeAdaptiveZoom(points, flyZoom);

  // ── Build raw fly keyframes first ──
  const totalDistance = points[points.length - 1].distanceFromStart || 1;
  const rawFlyFrames: CameraKeyframe[] = [];

  for (let i = 0; i < flyFrames; i++) {
    const t = i / Math.max(1, flyFrames - 1);
    const trackDist = t * totalDistance;

    const { idx, frac } = findPointAtDistance(points, trackDist);
    const p0 = points[idx];
    const p1 = points[Math.min(idx + 1, points.length - 1)];

    const lon = p0.lon + frac * (p1.lon - p0.lon);
    const lat = p0.lat + frac * (p1.lat - p0.lat);
    const ele = (p0.ele ?? 0) + frac * ((p1.ele ?? 0) - (p0.ele ?? 0));
    const spd = (p0.speed ?? 0) + frac * ((p1.speed ?? 0) - (p0.speed ?? 0));

    // Interpolate bearing between adjacent point bearings
    const b0 = smoothBearings[idx];
    const b1 = smoothBearings[Math.min(idx + 1, smoothBearings.length - 1)];
    const bearing = lerpAngle(b0, b1, frac);

    // Interpolate zoom
    const z0 = adaptiveZooms[idx];
    const z1 = adaptiveZooms[Math.min(idx + 1, adaptiveZooms.length - 1)];
    const zoom = z0 + frac * (z1 - z0);

    rawFlyFrames.push({
      center: [lon, lat],
      zoom,
      bearing,
      pitch: flyPitch,
      progress: t,
      phase: "fly",
      distanceKm: trackDist / 1000,
      elevationM: ele,
      speedKmh: spd,
    });
  }

  // ── Second-pass: smooth the fly keyframes across frames ──
  // This eliminates any remaining inter-frame jitter
  const frameSmooth = Math.max(5, Math.floor(flyFrames * 0.08));
  const smoothedCentersLon = smoothFloatArray(rawFlyFrames.map(f => f.center[0]), frameSmooth);
  const smoothedCentersLat = smoothFloatArray(rawFlyFrames.map(f => f.center[1]), frameSmooth);
  const smoothedZooms = smoothFloatArray(rawFlyFrames.map(f => f.zoom), frameSmooth);
  const smoothedBearings = smoothBearingArray(rawFlyFrames.map(f => f.bearing), frameSmooth);

  for (let i = 0; i < rawFlyFrames.length; i++) {
    rawFlyFrames[i].center = [smoothedCentersLon[i], smoothedCentersLat[i]];
    rawFlyFrames[i].zoom = smoothedZooms[i];
    rawFlyFrames[i].bearing = smoothedBearings[i];
  }

  // ── Assemble final keyframes ──
  const keyframes: CameraKeyframe[] = [];

  // Act 1: Intro
  const startCenter: [number, number] = rawFlyFrames[0].center;
  const startBearing = rawFlyFrames[0].bearing;
  const startZoom = rawFlyFrames[0].zoom;
  for (let i = 0; i < introFrames; i++) {
    const t = i / Math.max(1, introFrames - 1);
    const eased = easeInOutCubic(t);

    keyframes.push({
      center: lerpCoord(overviewCenter, startCenter, eased),
      zoom: lerp(overviewZoom, startZoom, eased),
      bearing: lerpAngle(0, startBearing, eased),
      pitch: lerp(0, flyPitch, eased),
      progress: 0,
      phase: "intro",
      distanceKm: 0,
      elevationM: points[0].ele ?? 0,
      speedKmh: 0,
    });
  }

  // Act 2: Fly (already smoothed)
  keyframes.push(...rawFlyFrames);

  // Act 3: Outro
  const endCenter: [number, number] = rawFlyFrames[rawFlyFrames.length - 1].center;
  const endBearing = rawFlyFrames[rawFlyFrames.length - 1].bearing;
  const endZoom = rawFlyFrames[rawFlyFrames.length - 1].zoom;
  const lastStats = points[points.length - 1];
  for (let i = 0; i < outroFrames; i++) {
    const t = i / Math.max(1, outroFrames - 1);
    const eased = easeInOutCubic(t);

    keyframes.push({
      center: lerpCoord(endCenter, overviewCenter, eased),
      zoom: lerp(endZoom, overviewZoom, eased),
      bearing: lerpAngle(endBearing, 0, eased),
      pitch: lerp(flyPitch, 0, eased),
      progress: 1,
      phase: "outro",
      distanceKm: lastStats.distanceFromStart / 1000,
      elevationM: lastStats.ele ?? 0,
      speedKmh: lastStats.speed ?? 0,
    });
  }

  return keyframes;
}

// ── Helpers ──

function computeBearings(points: TrackPoint[]): number[] {
  const bearings: number[] = [];
  for (let i = 0; i < points.length; i++) {
    // Use a lookahead window for more stable direction
    const lookAhead = Math.min(i + 5, points.length - 1);
    const prev = points[i];
    const next = points[lookAhead];
    const dLon = ((next.lon - prev.lon) * Math.PI) / 180;
    const lat1 = (prev.lat * Math.PI) / 180;
    const lat2 = (next.lat * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    bearing = ((bearing % 360) + 360) % 360;
    bearings.push(bearing);
  }
  return bearings;
}

/** Smooth bearings in sin/cos space to handle 0/360 wraparound */
function smoothBearingArray(values: number[], windowSize: number): number[] {
  if (values.length === 0) return [];
  const halfWin = Math.floor(windowSize / 2);
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - halfWin);
    const end = Math.min(values.length, i + halfWin + 1);
    let sinSum = 0, cosSum = 0;
    for (let j = start; j < end; j++) {
      const rad = (values[j] * Math.PI) / 180;
      sinSum += Math.sin(rad);
      cosSum += Math.cos(rad);
    }
    let avg = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
    avg = ((avg % 360) + 360) % 360;
    result.push(avg);
  }
  return result;
}

function computeAdaptiveZoom(points: TrackPoint[], baseZoom: number): number[] {
  const zooms: number[] = [];
  // Use large window for gentle zoom changes
  const windowSize = Math.max(10, Math.floor(points.length / 20));

  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - windowSize);
    const end = Math.min(points.length - 1, i + windowSize);
    const elevDiff = Math.abs((points[end].ele ?? 0) - (points[start].ele ?? 0));
    const distDiff = points[end].distanceFromStart - points[start].distanceFromStart;
    const gradient = distDiff > 0 ? elevDiff / distDiff : 0;

    // Gentle: max 0.4 zoom offset (was 0.8)
    const zoomOffset = Math.min(gradient * 2, 0.4);
    zooms.push(baseZoom - zoomOffset);
  }

  // Smooth zooms very aggressively
  const zoomSmooth = Math.max(20, Math.floor(points.length * 0.1));
  return smoothFloatArray(zooms, zoomSmooth);
}

function smoothFloatArray(values: number[], windowSize: number): number[] {
  const halfWin = Math.floor(windowSize / 2);
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - halfWin);
    const end = Math.min(values.length, i + halfWin + 1);
    let sum = 0;
    for (let j = start; j < end; j++) sum += values[j];
    result.push(sum / (end - start));
  }
  return result;
}

function findPointAtDistance(
  points: TrackPoint[],
  distance: number,
): { idx: number; frac: number } {
  for (let i = 1; i < points.length; i++) {
    if (points[i].distanceFromStart >= distance) {
      const prev = points[i - 1].distanceFromStart;
      const curr = points[i].distanceFromStart;
      const frac = curr > prev ? (distance - prev) / (curr - prev) : 0;
      return { idx: i - 1, frac: Math.max(0, Math.min(1, frac)) };
    }
  }
  return { idx: points.length - 1, frac: 0 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate angles handling 0/360 wraparound via shortest path */
function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + 540) % 360) - 180; // shortest angular distance
  let result = a + diff * t;
  return ((result % 360) + 360) % 360;
}

function lerpCoord(
  a: [number, number],
  b: [number, number],
  t: number,
): [number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
