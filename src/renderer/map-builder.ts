import type { Feature, FeatureCollection } from "geojson";
import type { CameraParams } from "../camera/bounds-calculator.js";
import type { CameraPreset } from "../camera/camera-presets.js";
import type { TrackLayerConfig } from "../styles/track-styles.js";
import type { OverlayData, WaypointMarker } from "../types/index.js";

export interface MapRenderConfig {
  style: object | string;
  styleName?: string;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  bounds: [number, number, number, number];
  padding: number;
  trackSource: {
    type: "geojson";
    data: FeatureCollection | Feature;
    lineMetrics: boolean;
  };
  trackLayer: object;
  markers?: {
    start: { lon: number; lat: number };
    end: { lon: number; lat: number };
  };
  waypoints?: WaypointMarker[];
  overlay?: OverlayData;
  contours?: boolean;
  contourColor?: string;
  contourLabelColor?: string;
  contourHaloColor?: string;
  terrain?: boolean;
}

export function buildMapConfig(
  styleConfig: { style: object | string },
  camera: CameraParams,
  cameraPreset: CameraPreset,
  trackLayer: TrackLayerConfig,
  options?: { styleName?: string; overlay?: OverlayData; contours?: boolean; waypoints?: WaypointMarker[]; terrain?: boolean }
): MapRenderConfig {
  // Pick contour colors based on style
  const isDark = options?.styleName === 'dark';
  return {
    style: styleConfig.style,
    styleName: options?.styleName,
    center: camera.center,
    zoom: camera.zoom,
    pitch: cameraPreset.pitch,
    bearing: cameraPreset.bearing,
    bounds: camera.bounds,
    padding: camera.padding,
    trackSource: trackLayer.source,
    trackLayer: trackLayer.layer,
    markers: trackLayer.markers,
    waypoints: options?.waypoints,
    overlay: options?.overlay,
    contours: options?.contours,
    contourColor: isDark ? 'rgba(200,200,200,0.25)' : 'rgba(100,100,100,0.35)',
    contourLabelColor: isDark ? 'rgba(200,200,200,0.6)' : 'rgba(80,80,80,0.65)',
    contourHaloColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
    terrain: options?.terrain,
  };
}
