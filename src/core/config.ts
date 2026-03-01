import { z } from "zod";
import type { ImageOptions, InfoOptions } from "../types/index.js";

export const imageOptionsSchema = z.object({
  input: z.string().min(1),
  output: z.string().min(1),
  width: z.number().int().min(100).max(7680).default(1920),
  height: z.number().int().min(100).max(4320).default(1080),
  dpi: z.number().int().min(1).max(4).default(2),
  colorBy: z.enum(["elevation", "speed", "gradient", "distance", "none"]).default("elevation"),
  colorRamp: z.enum(["turbo", "viridis", "plasma", "inferno", "rdylgn"]).default("turbo"),
  style: z.enum(["outdoor", "dark", "light", "topo", "satellite", "liberty", "bright", "positron"]).default("liberty"),
  perspective: z.enum(["auto", "overhead", "north-up"]).default("auto"),
  trackWidth: z.number().min(1).max(20).default(4),
  markers: z.boolean().default(true),
  padding: z.number().min(0).max(200).default(60),
  mapboxToken: z.string().optional(),
  outputFormat: z.enum(["human", "json"]).default("human"),
  quiet: z.boolean().default(false),
});

export const infoOptionsSchema = z.object({
  input: z.string().min(1),
  outputFormat: z.enum(["human", "json"]).default("human"),
});

export function validateImageOptions(opts: unknown): ImageOptions {
  return imageOptionsSchema.parse(opts) as ImageOptions;
}

export function validateInfoOptions(opts: unknown): InfoOptions {
  return infoOptionsSchema.parse(opts) as InfoOptions;
}
