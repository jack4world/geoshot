import type { FeatureCollection, LineString, Point } from "geojson";

export interface ParsedTrack {
  geojson: FeatureCollection;
  format: "gpx" | "kml";
  name?: string;
  trackCount: number;
  pointCount: number;
}

export interface TrackPoint {
  lon: number;
  lat: number;
  ele?: number;
  time?: Date;
  distanceFromStart: number; // meters
  speed?: number; // km/h
  gradient?: number; // percent
}

export interface TrackStats {
  distance: number; // meters
  elevationGain: number; // meters
  elevationLoss: number; // meters
  elevationMin: number;
  elevationMax: number;
  duration?: number; // seconds
  speedAvg?: number; // km/h
  speedMax?: number; // km/h
  pointCount: number;
  bounds: BBox;
}

export type BBox = [number, number, number, number]; // [west, south, east, north]

export interface AnalyzedTrack {
  stats: TrackStats;
  points: TrackPoint[];
  geojson: FeatureCollection;
}

export type ColorByMetric = "elevation" | "speed" | "gradient" | "distance" | "none";
export type ColorRamp = "turbo" | "viridis" | "plasma" | "inferno" | "rdylgn";
export type MapStyle = "outdoor" | "dark" | "light" | "topo" | "terrain" | "satellite" | "liberty" | "bright" | "positron" | "mapbox-outdoor" | "mapbox-satellite" | "mapbox-standard" | "mapbox-dark" | "mapbox-light";
export type Perspective = "auto" | "overhead" | "north-up";
export type OutputFormat = "human" | "json";
export type ImageFormat = "png" | "jpg" | "webp";

export interface ImageOptions {
  input: string;
  output: string;
  width: number;
  height: number;
  dpi: number;
  colorBy: ColorByMetric;
  colorRamp: ColorRamp;
  style: MapStyle;
  perspective: Perspective;
  trackWidth: number;
  markers: boolean;
  padding: number;
  mapboxToken?: string;
  overlay: boolean;
  overlayTitle?: string;
  outputFormat: OutputFormat;
  quiet: boolean;
}

export interface ElevationProfilePoint {
  distance: number; // km from start
  elevation: number; // meters
  color: string; // hex color at this point
}

export interface SpeedProfilePoint {
  distance: number; // km from start
  speed: number; // km/h
  color: string; // hex color at this point
}

export interface WaypointMarker {
  type: "start" | "end" | "peak" | "km";
  lon: number;
  lat: number;
  label: string;
  sublabel?: string;
}

export interface OverlayData {
  title?: string;
  distance?: string;
  elevation?: string;
  duration?: string;
  speed?: string;
  elevRange?: string;
  profile?: ElevationProfilePoint[];
  speedProfile?: SpeedProfilePoint[];
}

export interface VideoOptions {
  duration: number; // seconds
  fps: number; // frame rate
  music: "builtin" | "none";
  musicFile?: string; // custom music file path
}

export interface CameraKeyframe {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bearing: number;
  pitch: number;
  progress: number; // track progress 0~1
  phase: "intro" | "fly" | "outro";
  // overlay stats at this keyframe
  distanceKm: number;
  elevationM: number;
  speedKmh: number;
}

export interface InfoOptions {
  input: string;
  outputFormat: OutputFormat;
}

export interface CLIOutput {
  success: boolean;
  command: string;
  input: {
    file: string;
    format: string;
    tracks: number;
    points: number;
    distance_km: number;
    elevation_gain_m: number;
  };
  output?: {
    file: string;
    format: string;
    width: number;
    height: number;
    size_bytes: number;
  };
  stats?: TrackStats;
  timing: {
    parse_ms: number;
    render_ms?: number;
    total_ms: number;
  };
  error?: string;
}
