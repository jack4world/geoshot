import type { Command } from "commander";

export function addCommonOptions(cmd: Command): Command {
  return cmd
    .requiredOption("-i, --input <file>", "Input GPX or KML file")
    .option("--output-format <format>", "Output format: human or json", "human")
    .option("-q, --quiet", "Suppress non-essential output", false);
}

export function addImageOptions(cmd: Command): Command {
  return cmd
    .requiredOption("-o, --output <file>", "Output image file (png, jpg, webp)")
    .option("-w, --width <pixels>", "Image width", "1080")
    .option("-h, --height <pixels>", "Image height", "1920")
    .option("--dpi <scale>", "Device pixel ratio", "2")
    .option("--color-by <metric>", "Color track by: elevation, speed, gradient, distance, none", "elevation")
    .option("--color-ramp <ramp>", "Color ramp: turbo, viridis, plasma, inferno, rdylgn", "turbo")
    .option("--style <style>", "Map style: topo, terrain, liberty, bright, positron, outdoor, dark, light, satellite", "topo")
    .option("--perspective <view>", "Camera perspective: auto, overhead, north-up", "auto")
    .option("--track-width <width>", "Track line width in pixels", "5")
    .option("--track-color <color>", "Solid track color (hex), used with --color-by none", "#3b82f6")
    .option("--markers", "Show start/end markers", true)
    .option("--no-markers", "Hide start/end markers")
    .option("--padding <pixels>", "Map padding around track", "60")
    .option("--mapbox-token <token>", "Mapbox access token for satellite style")
    .option("--contours", "Show contour lines", true)
    .option("--no-contours", "Hide contour lines")
    .option("--overlay", "Show stats overlay on image", true)
    .option("--no-overlay", "Hide stats overlay")
    .option("--overlay-title <text>", "Custom title for the overlay");
}

export function addVideoOptions(cmd: Command): Command {
  return cmd
    .requiredOption("-o, --output <file>", "Output video file (mp4)")
    .option("-w, --width <pixels>", "Video width", "1080")
    .option("-h, --height <pixels>", "Video height", "1920")
    .option("--dpi <scale>", "Device pixel ratio", "2")
    .option("--duration <seconds>", "Video duration in seconds", "30")
    .option("--fps <rate>", "Frames per second", "30")
    .option("--color-by <metric>", "Color track by: elevation, speed, gradient, distance, none", "elevation")
    .option("--color-ramp <ramp>", "Color ramp: turbo, viridis, plasma, inferno, rdylgn", "turbo")
    .option("--style <style>", "Map style: topo, terrain, liberty, bright, positron, outdoor, dark, light, satellite", "topo")
    .option("--perspective <view>", "Camera perspective: auto, overhead, north-up", "auto")
    .option("--track-width <width>", "Track line width in pixels", "5")
    .option("--track-color <color>", "Solid track color (hex), used with --color-by none", "#3b82f6")
    .option("--markers", "Show start/end markers", true)
    .option("--no-markers", "Hide start/end markers")
    .option("--padding <pixels>", "Map padding around track", "60")
    .option("--mapbox-token <token>", "Mapbox access token for satellite style")
    .option("--contours", "Show contour lines", true)
    .option("--no-contours", "Hide contour lines")
    .option("--overlay", "Show stats overlay on video", true)
    .option("--no-overlay", "Hide stats overlay")
    .option("--overlay-title <text>", "Custom title for the overlay")
    .option("--terrain", "Enable 3D terrain", true)
    .option("--no-terrain", "Disable 3D terrain")
    .option("--music <type>", "Music: builtin or none", "builtin")
    .option("--music-file <path>", "Custom background music file (mp3)");
}
