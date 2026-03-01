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
    .option("-w, --width <pixels>", "Image width", "1920")
    .option("-h, --height <pixels>", "Image height", "1080")
    .option("--dpi <scale>", "Device pixel ratio", "2")
    .option("--color-by <metric>", "Color track by: elevation, speed, gradient, distance, none", "elevation")
    .option("--color-ramp <ramp>", "Color ramp: turbo, viridis, plasma, inferno, rdylgn", "turbo")
    .option("--style <style>", "Map style: liberty, bright, positron, outdoor, dark, light, topo, satellite", "liberty")
    .option("--perspective <view>", "Camera perspective: auto, overhead, north-up", "auto")
    .option("--track-width <width>", "Track line width in pixels", "4")
    .option("--track-color <color>", "Solid track color (hex), used with --color-by none", "#3b82f6")
    .option("--markers", "Show start/end markers", true)
    .option("--no-markers", "Hide start/end markers")
    .option("--padding <pixels>", "Map padding around track", "60")
    .option("--mapbox-token <token>", "Mapbox access token for satellite style")
    .option("--contours", "Show contour lines and hillshade", false)
    .option("--overlay", "Show stats overlay on image", false)
    .option("--overlay-title <text>", "Custom title for the overlay");
}
