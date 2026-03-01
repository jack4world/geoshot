import { resolve } from "node:path";
import { parseTrackFile } from "../../core/parser.js";
import { analyzeTrack } from "../../core/track-analyzer.js";
import { formatOutput } from "../output.js";
import type { CLIOutput, OutputFormat } from "../../types/index.js";

export async function runInfo(opts: {
  input: string;
  outputFormat: string;
  quiet: boolean;
}): Promise<void> {
  const start = Date.now();
  const inputPath = resolve(opts.input);
  const outputFormat = opts.outputFormat as OutputFormat;

  try {
    const parsed = await parseTrackFile(inputPath);
    const parseTime = Date.now() - start;

    const analyzed = analyzeTrack(parsed.geojson);
    const totalTime = Date.now() - start;

    const output: CLIOutput = {
      success: true,
      command: "info",
      input: {
        file: inputPath,
        format: parsed.format,
        tracks: parsed.trackCount,
        points: parsed.pointCount,
        distance_km: analyzed.stats.distance / 1000,
        elevation_gain_m: analyzed.stats.elevationGain,
      },
      stats: analyzed.stats,
      timing: {
        parse_ms: parseTime,
        total_ms: totalTime,
      },
    };

    console.log(formatOutput(output, outputFormat));
  } catch (err) {
    const totalTime = Date.now() - start;
    const output: CLIOutput = {
      success: false,
      command: "info",
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
