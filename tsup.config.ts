import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin/geoshot.ts", "src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: true,
  shims: true,
  banner: {
    js: "// geoshot - GPX/KML → image CLI tool",
  },
});
