// Programmatic API entry point
export { parseTrackFile } from "./core/parser.js";
export { analyzeTrack } from "./core/track-analyzer.js";
export { buildColorMapping } from "./core/color-mapper.js";
export { getMapStyleConfig } from "./styles/map-styles.js";
export { buildTrackLayer } from "./styles/track-styles.js";
export { calculateCamera } from "./camera/bounds-calculator.js";
export { getCameraPreset } from "./camera/camera-presets.js";
export { buildCameraPath } from "./camera/camera-path.js";
export { buildMapConfig } from "./renderer/map-builder.js";
export { renderImage, renderToFile, closeBrowser } from "./renderer/image-renderer.js";
export { renderVideo } from "./renderer/video-renderer.js";
export type * from "./types/index.js";
