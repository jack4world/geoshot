import chalk from "chalk";
import type { CLIOutput, TrackStats, OutputFormat } from "../types/index.js";

export function formatOutput(data: CLIOutput, format: OutputFormat): string {
  if (format === "json") {
    return JSON.stringify(data, null, 2);
  }
  return formatHuman(data);
}

function formatHuman(data: CLIOutput): string {
  const lines: string[] = [];

  if (!data.success) {
    lines.push(chalk.red(`Error: ${data.error}`));
    return lines.join("\n");
  }

  lines.push(chalk.bold(`\n  Track: ${data.input.file}`));
  lines.push(`  Format: ${data.input.format.toUpperCase()} | ${data.input.tracks} track(s) | ${data.input.points} points`);
  lines.push("");

  if (data.stats) {
    const s = data.stats;
    lines.push(chalk.bold("  Statistics:"));
    lines.push(`    Distance:        ${formatDistance(s.distance)}`);
    lines.push(`    Elevation Gain:  ${s.elevationGain.toFixed(0)} m`);
    lines.push(`    Elevation Loss:  ${s.elevationLoss.toFixed(0)} m`);
    lines.push(`    Elevation Range: ${s.elevationMin.toFixed(0)} m - ${s.elevationMax.toFixed(0)} m`);

    if (s.duration) {
      lines.push(`    Duration:        ${formatDuration(s.duration)}`);
    }
    if (s.speedAvg) {
      lines.push(`    Avg Speed:       ${s.speedAvg.toFixed(1)} km/h`);
    }
    if (s.speedMax) {
      lines.push(`    Max Speed:       ${s.speedMax.toFixed(1)} km/h`);
    }

    lines.push(`    Bounds:          [${s.bounds.map((b) => b.toFixed(4)).join(", ")}]`);
    lines.push("");
  }

  if (data.output) {
    lines.push(chalk.bold("  Output:"));
    lines.push(`    File:   ${data.output.file}`);
    lines.push(`    Size:   ${formatBytes(data.output.size_bytes)}`);
    lines.push(`    Dims:   ${data.output.width}x${data.output.height}`);
    lines.push("");
  }

  lines.push(chalk.dim(`  Time: ${data.timing.total_ms}ms`));
  lines.push("");

  return lines.join("\n");
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(0)} m`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
