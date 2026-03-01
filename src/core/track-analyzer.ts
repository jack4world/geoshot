import { bbox as turfBbox } from "@turf/bbox";
import { distance as turfDistance } from "@turf/distance";
import type { FeatureCollection, LineString, Position } from "geojson";
import type { AnalyzedTrack, BBox, TrackPoint, TrackStats } from "../types/index.js";

function extractCoordinates(geojson: FeatureCollection): Position[] {
  const coords: Position[] = [];
  for (const feature of geojson.features) {
    if (feature.geometry.type === "LineString") {
      coords.push(...(feature.geometry as LineString).coordinates);
    } else if (feature.geometry.type === "MultiLineString") {
      for (const line of feature.geometry.coordinates) {
        coords.push(...line);
      }
    }
  }
  return coords;
}

function extractTimes(geojson: FeatureCollection): (Date | undefined)[] {
  const times: (Date | undefined)[] = [];
  for (const feature of geojson.features) {
    const props = feature.properties ?? {};
    // @tmcw/togeojson stores times in coordinateProperties.times
    const coordTimes: string[] | undefined =
      props.coordinateProperties?.times ?? props.coordTimes ?? props.times;
    if (feature.geometry.type === "LineString") {
      const count = (feature.geometry as LineString).coordinates.length;
      if (coordTimes && coordTimes.length === count) {
        times.push(...coordTimes.map((t) => (t ? new Date(t) : undefined)));
      } else {
        times.push(...new Array(count).fill(undefined));
      }
    } else if (feature.geometry.type === "MultiLineString") {
      for (const line of feature.geometry.coordinates) {
        times.push(...new Array(line.length).fill(undefined));
      }
    }
  }
  return times;
}

export function analyzeTrack(geojson: FeatureCollection): AnalyzedTrack {
  const coordinates = extractCoordinates(geojson);
  const times = extractTimes(geojson);

  if (coordinates.length === 0) {
    throw new Error("No coordinates found in track");
  }

  const points: TrackPoint[] = [];
  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let elevationMin = Infinity;
  let elevationMax = -Infinity;
  let speedMax = 0;
  let hasElevation = false;
  let hasTime = false;

  for (let i = 0; i < coordinates.length; i++) {
    const [lon, lat, ele] = coordinates[i];
    const time = times[i];

    if (ele !== undefined) {
      hasElevation = true;
      elevationMin = Math.min(elevationMin, ele);
      elevationMax = Math.max(elevationMax, ele);
    }
    if (time) hasTime = true;

    let segmentDistance = 0;
    let speed: number | undefined;
    let gradient: number | undefined;

    if (i > 0) {
      const [prevLon, prevLat, prevEle] = coordinates[i - 1];
      const prevTime = times[i - 1];

      // Distance in meters
      segmentDistance = turfDistance(
        [prevLon, prevLat],
        [lon, lat],
        { units: "meters" }
      );
      totalDistance += segmentDistance;

      // Elevation changes
      if (ele !== undefined && prevEle !== undefined) {
        const elevDiff = ele - prevEle;
        if (elevDiff > 0) elevationGain += elevDiff;
        else elevationLoss += Math.abs(elevDiff);

        // Gradient (%)
        if (segmentDistance > 0) {
          gradient = (elevDiff / segmentDistance) * 100;
        }
      }

      // Speed (km/h)
      if (time && prevTime) {
        const timeDiffSeconds =
          (time.getTime() - prevTime.getTime()) / 1000;
        if (timeDiffSeconds > 0) {
          speed = (segmentDistance / 1000 / timeDiffSeconds) * 3600;
          speedMax = Math.max(speedMax, speed);
        }
      }
    }

    points.push({
      lon,
      lat,
      ele: ele !== undefined ? ele : undefined,
      time: time ?? undefined,
      distanceFromStart: totalDistance,
      speed,
      gradient,
    });
  }

  // Duration
  let duration: number | undefined;
  let speedAvg: number | undefined;
  if (hasTime && points[0].time && points[points.length - 1].time) {
    duration =
      (points[points.length - 1].time!.getTime() -
        points[0].time!.getTime()) /
      1000;
    if (duration > 0) {
      speedAvg = (totalDistance / 1000 / duration) * 3600;
    }
  }

  const bounds = turfBbox(geojson) as BBox;

  const stats: TrackStats = {
    distance: totalDistance,
    elevationGain: hasElevation ? elevationGain : 0,
    elevationLoss: hasElevation ? elevationLoss : 0,
    elevationMin: hasElevation ? elevationMin : 0,
    elevationMax: hasElevation ? elevationMax : 0,
    duration,
    speedAvg,
    speedMax: speedMax > 0 ? speedMax : undefined,
    pointCount: points.length,
    bounds,
  };

  return { stats, points, geojson };
}
