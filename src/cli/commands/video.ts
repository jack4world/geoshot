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
import { buildCameraPath } from "../../camera/camera-path.js";
import { renderVideo, closeBrowser } from "../../renderer/video-renderer.js";
import { formatOutput } from "../output.js";
import type {
  CLIOutput,
  ColorByMetric,
  ColorRamp,
  ElevationProfilePoint,
  MapStyle,
  OutputFormat,
  OverlayData,
  Perspective,
  VideoOptions,
} from "../../types/index.js";

export async function runVideo(opts: {
  input: string;
  output: string;
  width: string;
  height: string;
  dpi: string;
  duration: string;
  fps: string;
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
  terrain: boolean;
  overlay: boolean;
  overlayTitle?: string;
  music: string;
  musicFile?: string;
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
  const duration = parseInt(opts.duration, 10);
  const fps = parseInt(opts.fps, 10);
  const trackWidth = parseInt(opts.trackWidth, 10);
  const padding = parseInt(opts.padding, 10);
  const colorBy = opts.colorBy as ColorByMetric;
  const colorRamp = opts.colorRamp as ColorRamp;
  const mapStyle = opts.style as MapStyle;
  const perspective = opts.perspective as Perspective;

  const videoOpts: VideoOptions = {
    duration,
    fps,
    music: opts.music as "builtin" | "none",
    musicFile: opts.musicFile,
  };

  const totalFrames = duration * fps;

  const spinner =
    !opts.quiet && outputFormat !== "json"
      ? ora("Parsing track file...").start()
      : null;

  try {
    // Step 1: Parse
    const parsed = await parseTrackFile(inputPath);
    const parseTime = Date.now() - start;
    if (spinner) spinner.text = "Analyzing track...";

    // Step 2: Analyze
    const analyzed = analyzeTrack(parsed.geojson);
    if (spinner) spinner.text = "Building camera path...";

    // Step 3: Color mapping
    const colorMapping = buildColorMapping(
      analyzed.points,
      colorBy,
      colorRamp,
      opts.trackColor,
    );

    // Step 4: Build map config
    const styleConfig = getMapStyleConfig(mapStyle, opts.mapboxToken);
    const trackLayer = buildTrackLayer(
      parsed.geojson,
      colorMapping,
      trackWidth,
      opts.markers,
    );
    const camera = calculateCamera(analyzed.stats.bounds, width, height, padding);
    const cameraPreset = getCameraPreset(perspective);

    // Build overlay data for title/stats
    let overlay: OverlayData | undefined;
    if (opts.overlay) {
      const s = analyzed.stats;
      const distKm = s.distance / 1000;
      overlay = {
        title: opts.overlayTitle ?? parsed.name,
        distance:
          distKm >= 1
            ? `${distKm.toFixed(1)} km`
            : `${s.distance.toFixed(0)} m`,
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

      // Build elevation profile (downsample to ~200 points) for the elevation tracker
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
      const lastPt = analyzed.points[analyzed.points.length - 1];
      if (lastPt.ele !== undefined) {
        profile.push({
          distance: lastPt.distanceFromStart / 1000,
          elevation: lastPt.ele,
          color: colorMapping.colors[colorMapping.colors.length - 1] ?? "#3b82f6",
        });
      }
      if (profile.length > 0) overlay.profile = profile;
    }

    const mapConfig = buildMapConfig(styleConfig, camera, cameraPreset, trackLayer, {
      styleName: mapStyle,
      overlay,
      contours: opts.contours,
      terrain: opts.terrain,
      mapboxToken: opts.mapboxToken,
    });

    // Step 5: Build camera keyframes
    const keyframes = buildCameraPath(
      analyzed.points,
      analyzed.stats.bounds,
      totalFrames,
      camera.zoom,
      { terrain: opts.terrain },
    );

    // Extract all coordinates for progressive trail rendering
    // Include elevation so track renders above 3D terrain (+ offset to avoid z-fighting)
    const allCoordinates: number[][] = analyzed.points.map((p) => [p.lon, p.lat, (p.ele ?? 0) + 30]);

    // Get the dominant track color for the solid-color video track layer
    const trackBaseColor = colorMapping.colors[0] ?? "#3b82f6";

    // Step 6: Render video
    if (spinner) spinner.text = `Rendering video (0/${totalFrames} frames)...`;
    const renderStart = Date.now();

    const renderResult = await renderVideo(
      mapConfig,
      allCoordinates,
      colorMapping.colors,
      trackBaseColor,
      keyframes,
      outputPath,
      width,
      height,
      dpi,
      videoOpts,
      (pct) => {
        if (spinner) {
          if (pct < 0) {
            spinner.text = `Pre-loading terrain tiles...`;
          } else {
            const framesRendered = Math.round((pct / 100) * totalFrames);
            spinner.text = `Rendering video (${framesRendered}/${totalFrames} frames, ${pct}%)...`;
          }
        }
      },
    );
    const renderTime = Date.now() - renderStart;
    const totalTime = Date.now() - start;

    await closeBrowser();

    spinner?.succeed("Video saved!");

    const output: CLIOutput = {
      success: true,
      command: "video",
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
        format: "mp4",
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

    spinner?.fail("Failed to render video");

    const output: CLIOutput = {
      success: false,
      command: "video",
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
