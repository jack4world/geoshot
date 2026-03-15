import { resolve } from "node:path";
import ora from "ora";
import { parseTrackFile } from "../../core/parser.js";
import { analyzeTrack } from "../../core/track-analyzer.js";
import { buildColorMapping } from "../../core/color-mapper.js";
import { getMapStyleConfig } from "../../styles/map-styles.js";
import { buildTrackLayer } from "../../styles/track-styles.js";
import { calculateCamera } from "../../camera/bounds-calculator.js";
import { getCameraPreset } from "../../camera/camera-presets.js";
import { buildMapConfig } from "../../renderer/map-builder.js";
import { renderToFile, closeBrowser } from "../../renderer/image-renderer.js";
import { formatOutput } from "../output.js";
import type {
  CLIOutput,
  ColorByMetric,
  ColorRamp,
  ElevationProfilePoint,
  ImageFormat,
  MapStyle,
  OutputFormat,
  OverlayData,
  Perspective,
  SpeedProfilePoint,
  WaypointMarker,
} from "../../types/index.js";

export async function runImage(opts: {
  input: string;
  output: string;
  width: string;
  height: string;
  dpi: string;
  colorBy: string;
  colorRamp: string;
  style: string;
  perspective: string;
  trackWidth: string;
  trackColor: string;
  markers: boolean;
  padding: string;
  mapboxToken?: string;
  contours: boolean;
  overlay: boolean;
  overlayTitle?: string;
  outputFormat: string;
  quiet: boolean;
}): Promise<void> {
  const start = Date.now();
  const inputPath = resolve(opts.input);
  const outputPath = resolve(opts.output);
  const outputFormat = opts.outputFormat as OutputFormat;
  const width = parseInt(opts.width, 10);
  const height = parseInt(opts.height, 10);
  const dpi = parseInt(opts.dpi, 10);
  const trackWidth = parseInt(opts.trackWidth, 10);
  const padding = parseInt(opts.padding, 10);
  const colorBy = opts.colorBy as ColorByMetric;
  const colorRamp = opts.colorRamp as ColorRamp;
  const mapStyle = opts.style as MapStyle;
  const perspective = opts.perspective as Perspective;

  const spinner = !opts.quiet && outputFormat !== "json"
    ? ora("Parsing track file...").start()
    : null;

  try {
    // Step 1: Parse
    const parsed = await parseTrackFile(inputPath);
    const parseTime = Date.now() - start;
    spinner?.text && (spinner.text = "Analyzing track...");

    // Step 2: Analyze
    const analyzed = analyzeTrack(parsed.geojson);
    spinner?.text && (spinner.text = "Building map configuration...");

    // Step 3: Color mapping
    const colorMapping = buildColorMapping(
      analyzed.points,
      colorBy,
      colorRamp,
      opts.trackColor
    );

    // Step 4: Build styles and camera
    const styleConfig = getMapStyleConfig(mapStyle, opts.mapboxToken);
    const trackLayer = buildTrackLayer(
      parsed.geojson,
      colorMapping,
      trackWidth,
      opts.markers
    );
    const camera = calculateCamera(analyzed.stats.bounds, width, height, padding);
    const cameraPreset = getCameraPreset(perspective);

    // Build overlay data if requested
    let overlay: OverlayData | undefined;
    if (opts.overlay) {
      const s = analyzed.stats;
      const distKm = s.distance / 1000;
      overlay = {
        title: opts.overlayTitle ?? parsed.name,
        distance: distKm >= 1 ? `${distKm.toFixed(1)} km` : `${s.distance.toFixed(0)} m`,
        elevation: `${s.elevationGain.toFixed(0)} m`,
      };
      if (s.duration) {
        const h = Math.floor(s.duration / 3600);
        const m = Math.floor((s.duration % 3600) / 60);
        overlay.duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
      if (s.speedAvg) {
        overlay.speed = `${s.speedAvg.toFixed(1)} km/h`;
      }
      overlay.elevRange = `${s.elevationMin.toFixed(0)}–${s.elevationMax.toFixed(0)} m`;

      // Build elevation profile data (downsample to ~200 points)
      const profileStep = Math.max(1, Math.floor(analyzed.points.length / 200));
      const profile: ElevationProfilePoint[] = [];
      for (let i = 0; i < analyzed.points.length; i += profileStep) {
        const pt = analyzed.points[i];
        if (pt.ele !== undefined) {
          profile.push({
            distance: pt.distanceFromStart / 1000,
            elevation: pt.ele,
            color: colorMapping.colors[i] ?? "#3b82f6",
          });
        }
      }
      // Always include last point
      const lastPt = analyzed.points[analyzed.points.length - 1];
      if (lastPt.ele !== undefined) {
        profile.push({
          distance: lastPt.distanceFromStart / 1000,
          elevation: lastPt.ele,
          color: colorMapping.colors[colorMapping.colors.length - 1] ?? "#3b82f6",
        });
      }
      if (profile.length > 0) {
        overlay.profile = profile;
      }

      // Build speed profile data (downsample to ~200 points)
      const speedProfile: SpeedProfilePoint[] = [];
      const hasSpeed = analyzed.points.some(p => p.speed !== undefined);
      if (hasSpeed) {
        for (let i = 0; i < analyzed.points.length; i += profileStep) {
          const pt = analyzed.points[i];
          if (pt.speed !== undefined) {
            speedProfile.push({
              distance: pt.distanceFromStart / 1000,
              speed: pt.speed,
              color: colorMapping.colors[i] ?? "#3b82f6",
            });
          }
        }
        // Always include last point
        if (lastPt.speed !== undefined) {
          speedProfile.push({
            distance: lastPt.distanceFromStart / 1000,
            speed: lastPt.speed,
            color: colorMapping.colors[colorMapping.colors.length - 1] ?? "#3b82f6",
          });
        }
        if (speedProfile.length > 0) {
          overlay.speedProfile = speedProfile;
        }
      }
    }

    // Build waypoint markers (start, end, peak, km markers)
    const waypoints: WaypointMarker[] = [];
    const pts = analyzed.points;
    if (pts.length > 0) {
      // Start marker
      const startPt = pts[0];
      waypoints.push({
        type: "start",
        lon: startPt.lon,
        lat: startPt.lat,
        label: "起点",
        sublabel: startPt.ele !== undefined ? `${startPt.ele.toFixed(0)}m` : undefined,
      });
      // End marker
      const endPt = pts[pts.length - 1];
      waypoints.push({
        type: "end",
        lon: endPt.lon,
        lat: endPt.lat,
        label: "终点",
        sublabel: endPt.ele !== undefined ? `${endPt.ele.toFixed(0)}m` : undefined,
      });
      // Peak marker (highest elevation point)
      let peakPt = pts[0];
      for (const p of pts) {
        if ((p.ele ?? -Infinity) > (peakPt.ele ?? -Infinity)) peakPt = p;
      }
      if (peakPt.ele !== undefined && peakPt !== pts[0] && peakPt !== pts[pts.length - 1]) {
        waypoints.push({
          type: "peak",
          lon: peakPt.lon,
          lat: peakPt.lat,
          label: `${peakPt.ele.toFixed(0)}m`,
        });
      }
      // Km distance markers
      const totalKm = analyzed.stats.distance / 1000;
      const kmInterval = totalKm <= 5 ? 1 : totalKm <= 15 ? 2 : 5;
      let nextKm = kmInterval;
      for (let i = 1; i < pts.length && nextKm < totalKm; i++) {
        const prevDist = pts[i - 1].distanceFromStart / 1000;
        const curDist = pts[i].distanceFromStart / 1000;
        if (prevDist < nextKm && curDist >= nextKm) {
          // Interpolate position
          const frac = (nextKm - prevDist) / (curDist - prevDist);
          const lon = pts[i - 1].lon + frac * (pts[i].lon - pts[i - 1].lon);
          const lat = pts[i - 1].lat + frac * (pts[i].lat - pts[i - 1].lat);
          waypoints.push({
            type: "km",
            lon,
            lat,
            label: `${nextKm}km`,
          });
          nextKm += kmInterval;
        }
      }
    }

    const mapConfig = buildMapConfig(styleConfig, camera, cameraPreset, trackLayer, {
      styleName: mapStyle,
      overlay,
      contours: opts.contours,
      waypoints,
      mapboxToken: opts.mapboxToken,
    });

    // Step 5: Render
    spinner?.text && (spinner.text = "Rendering map...");
    const renderStart = Date.now();
    const renderResult = await renderToFile(
      mapConfig,
      outputPath,
      width,
      height,
      dpi
    );
    const renderTime = Date.now() - renderStart;
    const totalTime = Date.now() - start;

    await closeBrowser();

    spinner?.succeed("Image saved!");

    const output: CLIOutput = {
      success: true,
      command: "image",
      input: {
        file: inputPath,
        format: parsed.format,
        tracks: parsed.trackCount,
        points: parsed.pointCount,
        distance_km: analyzed.stats.distance / 1000,
        elevation_gain_m: analyzed.stats.elevationGain,
      },
      output: {
        file: outputPath,
        format: renderResult.format,
        width,
        height,
        size_bytes: renderResult.sizeBytes,
      },
      timing: {
        parse_ms: parseTime,
        render_ms: renderTime,
        total_ms: totalTime,
      },
    };

    console.log(formatOutput(output, outputFormat));
  } catch (err) {
    await closeBrowser().catch(() => {});
    const totalTime = Date.now() - start;

    spinner?.fail("Failed to render image");

    const output: CLIOutput = {
      success: false,
      command: "image",
      input: {
        file: inputPath,
        format: "unknown",
        tracks: 0,
        points: 0,
        distance_km: 0,
        elevation_gain_m: 0,
      },
      timing: {
        parse_ms: 0,
        total_ms: totalTime,
      },
      error: err instanceof Error ? err.message : String(err),
    };

    console.log(formatOutput(output, outputFormat));
    process.exitCode = 1;
  }
}
