import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createPage, closeBrowser } from "./browser-manager.js";
import { isMapboxStyle } from "../styles/map-styles.js";
import type { MapRenderConfig } from "./map-builder.js";
import type { ImageFormat, MapStyle } from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface RenderResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: ImageFormat;
}

export async function renderImage(
  config: MapRenderConfig,
  width: number,
  height: number,
  dpi: number,
  outputFormat: ImageFormat
): Promise<RenderResult> {
  const page = await createPage(width, height, dpi);

  try {
    // Load the map HTML template — use Mapbox template for Mapbox styles
    const useMapbox = config.styleName ? isMapboxStyle(config.styleName as MapStyle) : false;
    const templateFile = useMapbox ? "map-mapbox.html" : "map.html";
    const templatePath = join(__dirname, "templates", templateFile);
    let html: string;
    try {
      html = await readFile(templatePath, "utf-8");
    } catch {
      const srcTemplatePath = join(
        dirname(dirname(__dirname)),
        "src",
        "renderer",
        "templates",
        templateFile,
      );
      html = await readFile(srcTemplatePath, "utf-8");
    }

    await page.setContent(html, { waitUntil: "networkidle0" });

    // Inject config and initialize map
    await page.evaluate(async (cfg) => {
      // @ts-ignore - initMap is defined in the HTML template
      await (window as any).initMap(cfg);
    }, config as any);

    // Take screenshot
    const screenshotType = outputFormat === "jpg" ? "jpeg" : outputFormat === "webp" ? "webp" : "png";
    const buffer = await page.screenshot({
      type: screenshotType,
      fullPage: false,
      ...(screenshotType === "jpeg" ? { quality: 90 } : {}),
    });

    return {
      buffer: Buffer.from(buffer),
      width,
      height,
      format: outputFormat,
    };
  } finally {
    await page.close();
  }
}

export async function renderToFile(
  config: MapRenderConfig,
  outputPath: string,
  width: number,
  height: number,
  dpi: number
): Promise<{ sizeBytes: number; format: ImageFormat }> {
  const ext = outputPath.split(".").pop()?.toLowerCase();
  let format: ImageFormat = "png";
  if (ext === "jpg" || ext === "jpeg") format = "jpg";
  else if (ext === "webp") format = "webp";

  const result = await renderImage(config, width, height, dpi, format);
  await writeFile(outputPath, result.buffer);

  return {
    sizeBytes: result.buffer.length,
    format,
  };
}

export { closeBrowser };
