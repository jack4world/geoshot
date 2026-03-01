import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createPage, closeBrowser } from "./browser-manager.js";
import type { MapRenderConfig } from "./map-builder.js";
import type { CameraKeyframe, VideoOptions } from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface VideoRenderResult {
  sizeBytes: number;
  duration: number;
  frames: number;
}

export async function renderVideo(
  config: MapRenderConfig,
  allCoordinates: number[][],
  trackColors: string[],
  trackBaseColor: string,
  keyframes: CameraKeyframe[],
  outputPath: string,
  width: number,
  height: number,
  dpi: number,
  videoOpts: VideoOptions,
  onProgress?: (pct: number) => void,
): Promise<VideoRenderResult> {
  const totalFrames = keyframes.length;
  const fps = videoOpts.fps;

  // Create Puppeteer page
  const page = await createPage(width, height, dpi);

  try {
    // Load video template
    const templatePath = join(__dirname, "templates", "map-video.html");
    let html: string;
    try {
      html = await readFile(templatePath, "utf-8");
    } catch {
      const srcTemplatePath = join(
        dirname(dirname(__dirname)),
        "src",
        "renderer",
        "templates",
        "map-video.html",
      );
      html = await readFile(srcTemplatePath, "utf-8");
    }

    await page.setContent(html, { waitUntil: "networkidle0" });

    // Initialize the video map with config + extra data for progressive trail
    const videoConfig = {
      ...config,
      allCoordinates,
      trackColors,
      trackBaseColor,
    };

    await page.evaluate(async (cfg: any) => {
      await (window as any).initVideoMap(cfg);
    }, videoConfig as any);

    // Resolve music file path
    let musicPath: string | undefined;
    if (videoOpts.musicFile) {
      musicPath = resolve(videoOpts.musicFile);
    } else if (videoOpts.music === "builtin") {
      // Try to find builtin music
      const builtinPaths = [
        join(__dirname, "..", "assets", "bgm.mp3"),
        join(dirname(dirname(__dirname)), "src", "assets", "bgm.mp3"),
      ];
      for (const p of builtinPaths) {
        try {
          await readFile(p);
          musicPath = p;
          break;
        } catch {
          // continue
        }
      }
    }

    // Find ffmpeg binary
    let ffmpegPath: string;
    try {
      const ffmpegStatic = await import("ffmpeg-static");
      ffmpegPath = (ffmpegStatic.default as unknown as string) || "ffmpeg";
    } catch {
      ffmpegPath = "ffmpeg";
    }

    // Build FFmpeg args
    const ffmpegArgs: string[] = [
      "-y", // overwrite output
      "-f", "image2pipe",
      "-framerate", String(fps),
      "-i", "pipe:0",
    ];

    if (musicPath) {
      ffmpegArgs.push("-i", musicPath);
      ffmpegArgs.push("-map", "0:v", "-map", "1:a");
      ffmpegArgs.push("-shortest");
      ffmpegArgs.push("-af", `afade=t=out:st=${videoOpts.duration - 2}:d=2`);
    }

    ffmpegArgs.push(
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      outputPath,
    );

    // Spawn FFmpeg process
    const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let ffmpegError = "";
    ffmpeg.stderr?.on("data", (chunk: Buffer) => {
      ffmpegError += chunk.toString();
    });

    const ffmpegDone = new Promise<void>((resolve, reject) => {
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}: ${ffmpegError.slice(-500)}`));
      });
      ffmpeg.on("error", reject);
    });

    // Frame rendering loop
    for (let i = 0; i < totalFrames; i++) {
      const kf = keyframes[i];

      // Advance the frame in the browser
      await page.evaluate(
        (keyframe: any, frameIndex: number, total: number) => {
          (window as any).advanceFrame(keyframe, frameIndex, total);
        },
        kf as any,
        i,
        totalFrames,
      );

      // Wait for map to finish rendering (tiles loaded, terrain settled)
      const waitTimeout = i < 3 ? 2000 : 500;
      await page.evaluate(
        (timeout: number) => (window as any).waitForStable(timeout),
        waitTimeout,
      );

      // Screenshot as PNG
      const buffer = await page.screenshot({
        type: "png",
        fullPage: false,
      });

      // Write to FFmpeg stdin
      const ok = ffmpeg.stdin!.write(Buffer.from(buffer));
      if (!ok) {
        // Backpressure: wait for drain
        await new Promise<void>((resolve) => ffmpeg.stdin!.once("drain", resolve));
      }

      // Report progress
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalFrames) * 100));
      }
    }

    // Close FFmpeg stdin to signal end of frames
    ffmpeg.stdin!.end();

    // Wait for FFmpeg to finish encoding
    await ffmpegDone;

    // Get output file size
    const { stat } = await import("node:fs/promises");
    const outputStat = await stat(outputPath);

    return {
      sizeBytes: outputStat.size,
      duration: videoOpts.duration,
      frames: totalFrames,
    };
  } finally {
    await page.close();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { closeBrowser };
