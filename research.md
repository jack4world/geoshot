# Geoshot Codebase Research Report

## Overview

**Geoshot** is a Node.js CLI tool (v0.1.0) that converts GPS track files (GPX/KML) into high-quality map images and cinematic flythrough videos. It uses a headless browser rendering pipeline (Puppeteer + MapLibre GL) to produce polished cartographic outputs without requiring a display server.

---

## Project Structure

```
geoshot/
├── bin/
│   └── geoshot.ts               # CLI entry point, command registration
├── src/
│   ├── cli/
│   │   ├── options.ts           # Commander option definitions
│   │   ├── output.ts            # Human/JSON output formatting
│   │   └── commands/
│   │       ├── info.ts          # Track statistics command
│   │       ├── image.ts         # Static image rendering pipeline
│   │       └── video.ts         # Video rendering pipeline
│   ├── core/
│   │   ├── parser.ts            # GPX/KML → GeoJSON via @tmcw/togeojson
│   │   ├── track-analyzer.ts    # Statistics extraction & interpolation
│   │   ├── color-mapper.ts      # Track colorization with 5 color ramps
│   │   └── config.ts            # Zod schemas for option validation
│   ├── camera/
│   │   ├── bounds-calculator.ts # Viewport zoom/center calculation
│   │   ├── camera-path.ts       # 3-act video camera keyframe generation
│   │   └── camera-presets.ts    # Perspective settings (overhead, north-up, auto)
│   ├── renderer/
│   │   ├── browser-manager.ts   # Puppeteer browser lifecycle management
│   │   ├── map-builder.ts       # MapRenderConfig assembly
│   │   ├── image-renderer.ts    # Static image rendering via Puppeteer
│   │   ├── video-renderer.ts    # Frame-by-frame rendering + FFmpeg encoding
│   │   └── templates/
│   │       ├── map.html         # Static map HTML template with UI overlays
│   │       └── map-video.html   # Video map template with HUD & transitions
│   ├── styles/
│   │   ├── map-styles.ts        # 8 tile source definitions
│   │   └── track-styles.ts      # MapLibre layer config for track rendering
│   ├── types/
│   │   └── index.ts             # All TypeScript interfaces
│   └── index.ts                 # Programmatic API exports
├── test/                        # Vitest unit tests + fixtures
├── tsconfig.json
├── tsup.config.ts
└── package.json
```

---

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js 18+ (ESM, ES2022) |
| Language | TypeScript 5.7.3 |
| Build | tsup 8.4.0 |
| Testing | Vitest 3.0.7 |
| Map Rendering | MapLibre GL 4.7.1 |
| Headless Browser | Puppeteer 24.4.0 |
| GPS Parsing | @tmcw/togeojson 5.8.1 + JSDOM |
| Geospatial Math | Turf.js |
| Colors | Chroma.js 3.1.2 |
| Video Encoding | FFmpeg (fluent-ffmpeg 2.1.3 + ffmpeg-static 5.3.0) |
| CLI Framework | Commander.js 13.1.0 |
| Validation | Zod |

---

## CLI Commands

### `geoshot info -i track.gpx`
Parses a GPX/KML file and outputs track statistics (distance, elevation, speeds, bounds). Supports `--output-format human|json`.

### `geoshot image -i track.gpx -o map.png [OPTIONS]`

Key options:
- `-w / -h`: output dimensions (default 1080×1920)
- `--dpi`: device pixel ratio for HiDPI (default 2)
- `--color-by`: `elevation | speed | gradient | distance | none`
- `--color-ramp`: `turbo | viridis | plasma | inferno | rdylgn`
- `--style`: `topo | liberty | bright | positron | outdoor | dark | light | satellite`
- `--perspective`: `auto | overhead | north-up`
- `--track-width`: line width in pixels (default 5)
- `--[no-]markers`: start/end/peak waypoints + km markers
- `--padding`: map padding around track (default 60px)
- `--[no-]contours`: enable/disable contour line overlay
- `--[no-]overlay`: enable/disable stats overlay with charts

### `geoshot video -i track.gpx -o flythrough.mp4 [OPTIONS]`

Inherits all image options, plus:
- `--duration`: video length in seconds (default 30)
- `--fps`: frames per second (default 30)
- `--[no-]terrain`: 3D terrain rendering (default on)
- `--music`: `builtin | none`
- `--music-file`: path to custom MP3

---

## Data Flow

```
File (GPX/KML)
     │
     ▼
 parseTrackFile()          → ParsedTrack { geojson, format, name, counts }
     │
     ▼
 analyzeTrack()            → AnalyzedTrack { stats, points[], geojson }
     │
     ▼
 buildColorMapping()       → ColorMapping { colors[], stops[], expression }
     │
     ▼
 buildMapRenderConfig()    → MapRenderConfig (center, zoom, style, layers...)
     │
     ├─── renderImage()    → PNG/JPG/WebP file
     │
     └─── renderVideo()    → MP4 file (via FFmpeg)
```

### Parsing (`src/core/parser.ts`)
- Reads file as text, detects format from extension
- Parses via JSDOM + `@tmcw/togeojson` (`gpx()` or `kml()` functions)
- Filters to `LineString` / `MultiLineString` features
- Outputs `ParsedTrack { geojson, format, name, trackCount, pointCount }`

### Analysis (`src/core/track-analyzer.ts`)
Extracts per-point metrics and aggregates statistics:
- **Distance:** cumulative Haversine (via `turfDistance`) in meters
- **Elevation Gain/Loss:** sum of positive/negative point-to-point elevation deltas
- **Speed:** derived from time deltas between GPS points (km/h)
- **Gradient:** `(elevDiff / distance) × 100` (percent)
- **Bounds:** `turfBbox()` on the GeoJSON

Key type `TrackPoint`: `{ lon, lat, ele?, time?, distanceFromStart, speed?, gradient? }`

### Color Mapping (`src/core/color-mapper.ts`)
- Selects metric (elevation/speed/gradient/distance)
- Normalizes values to 0–1 range
- Applies Chroma.js scale to produce per-point hex colors
- Builds a MapLibre `line-gradient` interpolate expression (capped at 64 stops due to WebGL constraint)

Color ramp palettes (Chroma.js scales):
- **turbo**: purple → blue → cyan → green → yellow → orange → red
- **viridis**: dark purple → blue → teal → green → yellow
- **plasma**: dark blue → purple → pink → orange → yellow
- **inferno**: black → purple → red → orange → yellow
- **rdylgn**: red → yellow → green

---

## Rendering Pipeline

### Headless Browser Architecture

Puppeteer launches a Chromium instance with WebGL enabled:
```
--enable-webgl --enable-webgl2 --use-gl=angle
--no-sandbox --disable-setuid-sandbox
--disable-dev-shm-usage
```

A singleton `Browser` instance is reused across renders. Pages are created with the target viewport + DPI.

### Static Image Rendering (`src/renderer/image-renderer.ts`)

1. Create Puppeteer page (viewport = output dimensions × DPI)
2. Load `map.html` template
3. Inject `MapRenderConfig` via `page.evaluate(() => initMap(config))`
4. Wait for map idle (tiles loaded, render complete)
5. `page.screenshot()` → PNG/JPEG/WebP buffer
6. Write to output file

### Video Rendering (`src/renderer/video-renderer.ts`)

**3-Act Structure** (default 30s @ 30fps = 900 frames):
```
Act 1: INTRO  (15% = ~135 frames)
  Camera zooms into track start; title + HUD fades in

Act 2: FLY    (70% = ~630 frames)
  Camera follows track; trail progressively revealed; live stats update

Act 3: OUTRO  (15% = ~135 frames)
  Camera zooms out to full overview; final stats card fades in; fade to black
```

**Frame Loop:**
```
for each frame i:
  1. Compute keyframe (center, zoom, bearing, pitch, progress, phase)
  2. page.evaluate(() => advanceFrame(kf, i, totalFrames))
  3. page.evaluate(() => waitForStable(timeout))  // wait for tile loads
  4. buffer = page.screenshot({ type: 'png' })
  5. ffmpeg.stdin.write(buffer)
```

**FFmpeg Configuration:**
- Input: PNG frames piped via stdin (`-f image2pipe`)
- Codec: H.264 (`libx264`), preset `medium`, CRF 23
- Pixel format: `yuv420p` (universal compatibility)
- `+faststart` flag for web streaming
- Optional audio: faded background music mixed in

### Camera Path Generation (`src/camera/camera-path.ts`)

`buildCameraPath(points[], bounds, totalFrames, overviewZoom, {terrain})` → `CameraKeyframe[]`

Multi-pass smoothing pipeline:
1. **Raw bearings:** computed using spherical trigonometry with 5-point lookahead
2. **Bearing smoothing:** rolling average in sin/cos space (handles 0°/360° wraparound)
3. **Center smoothing:** rolling window of 8% of fly-phase frame count
4. **Zoom smoothing:** aggressive rolling window of 10% of point count
5. **Easing:** `easeInOutCubic` applied to intro/outro transition phases

Pitch: `55°` with terrain enabled, `60°` without (both give cinematic 3D feel).

### Progressive Track Reveal

During video rendering, at each frame the track source is updated with only the coordinates up to the current progress position:
```js
idx = Math.floor(progress * (allCoords.length - 1))
partial = allCoords.slice(0, idx + 1)
map.getSource('track').setData(partial)
```

---

## Map Styles & Tile Sources

### Vector Styles (via OpenFreeMap — no auth required)
| Style | URL |
|---|---|
| liberty | `tiles.openfreemap.org/styles/liberty` |
| bright | `tiles.openfreemap.org/styles/bright` |
| positron | `tiles.openfreemap.org/styles/positron` |

### Raster Styles (inline `version: 8` style objects)
| Style | Source |
|---|---|
| topo | OpenTopoMap `tile.opentopomap.org/{z}/{x}/{y}.png` |
| outdoor | CartoDB Voyager `basemaps.cartocdn.com/rastertiles/voyager/...` |
| light | CartoDB Positron `basemaps.cartocdn.com/light_all/...` |
| dark | CartoDB Dark Matter `basemaps.cartocdn.com/dark_all/...` |
| satellite | Mapbox Satellite (requires `--mapbox-token`) |

### 3D Terrain & Contours
- Terrain DEM source: **AWS Terrarium** `s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` (free, no auth)
- Contour lines: **mlcontour** library, major (100m) + minor (10m) with labels, sourced from same Terrarium tiles

---

## HTML Templates

### `map.html` (Static Image)

Responsive design based on aspect ratio:

**Portrait (height > width × 1.2):**
- Top hero bar: gradient overlay, title, stats summary line
- Bottom card: 3-column stats grid + stacked elevation/speed charts

**Landscape:**
- Bottom strip: title + stats + charts side-by-side

**UI Components:**
- **Custom HTML markers:** start (green), end (red), peak (orange), km dots
- **Elevation profile chart:** HTML5 Canvas, gradient fill, color-mapped line, grid, peak/min markers
- **Speed profile chart:** same design, with max speed + avg speed dashed line
- **Contour overlay:** enabled via `mlcontour` MapLibre plugin

### `map-video.html` (Video)

Animated HUD elements:
- **Title overlay:** gradient background, hero title (72px/800w), accent line, subtitle — fades during intro
- **Stats HUD:** glassmorphic card (backdrop-filter blur), 3 live stats (distance, elevation, speed) — visible from fly phase
- **Outro overlay:** centered final stats card — fades in during outro
- **Progress bar:** 3px bottom gradient bar, animates 0→100%
- **Vignette:** dark inset shadow for cinematic look

Browser-side API:
- `window.initVideoMap(config)` — initialize map
- `window.advanceFrame(kf, i, n)` — update camera + track reveal + overlays
- `window.waitForStable(ms)` — wait for tiles to settle before screenshot

---

## Key Algorithms

### Zoom Level from Bounds
```
lngSpan = east - west
latSpan = north - south
lngZoom = log₂((360 × effectiveWidth) / (256 × lngSpan))
latZoom = log₂((180 × effectiveHeight) / (256 × latSpan))
zoom = min(lngZoom, latZoom, 18)
```

### Bearing Calculation (Camera Direction)
```
dLon = (next.lon - prev.lon) × π/180
y = sin(dLon) × cos(lat2)
x = cos(lat1) × sin(lat2) - sin(lat1) × cos(lat2) × cos(dLon)
bearing = atan2(y, x) × 180/π
```

### Angle Interpolation (Shortest Path, 0°/360° Safe)
```
diff = ((b - a + 540) % 360) - 180
result = a + diff × t
```

### MapLibre Line Gradient Expression (≤64 stops)
```js
["interpolate", ["linear"], ["line-progress"], 0, "#color1", 0.2, "#color2", ..., 1, "#colorN"]
```

---

## Type System (`src/types/index.ts`)

Core types:

```typescript
ParsedTrack { geojson, format: "gpx"|"kml", name?, trackCount, pointCount }

TrackPoint { lon, lat, ele?, time?, distanceFromStart, speed?, gradient? }

TrackStats { distance, elevationGain, elevationLoss, elevationMin, elevationMax,
             duration?, speedAvg?, speedMax?, pointCount, bounds }

ColorMapping { colors: string[], stops: number[], expression: any }

MapRenderConfig { style, styleName, center, zoom, pitch, bearing, bounds, padding,
                  trackSource, trackLayer, markers?, waypoints?, overlay?, contours?, terrain? }

CameraKeyframe { center, zoom, bearing, pitch, progress, phase, distanceKm, elevationM, speedKmh }

OverlayData { title?, distance?, elevation?, duration?, speed?, elevRange?,
              profile?, speedProfile? }

WaypointMarker { type: "start"|"end"|"peak"|"km", lon, lat, label, sublabel? }
```

---

## Validation (`src/core/config.ts`)

Zod schemas enforce:
- `width/height`: 100–7680 / 100–4320 px
- `dpi`: 1–4x
- `colorBy`: enum (elevation | speed | gradient | distance | none)
- `colorRamp`: enum (turbo | viridis | plasma | inferno | rdylgn)
- `style`: enum (8 values)
- `padding`: 0–200px
- `trackWidth`: 1–20px

---

## Output Format (`src/cli/output.ts`)

**JSON mode** (`--output-format json`):
```json
{
  "success": true,
  "command": "image",
  "input": { "file": "...", "format": "gpx", "tracks": 1, "points": 1000, "distance_km": 12.5, "elevation_gain_m": 450 },
  "output": { "file": "...", "format": "png", "width": 2160, "height": 3840, "size_bytes": 2621440 },
  "timing": { "parse_ms": 85, "render_ms": 1240, "total_ms": 1325 }
}
```

**Human mode**: Formatted table with icons and aligned columns.

---

## Build System

- **tsup** bundles `src/` + `bin/` into `dist/` as ESM
- HTML templates are copied from `src/renderer/templates/` → `dist/`
- TypeScript target: ES2022, Node.js 20
- Source maps and `.d.ts` declaration files generated

```
npm run build   # one-time build
npm run dev     # watch mode
npm run test    # vitest unit tests
```

---

## Testing

Vitest unit tests cover:
- `parser.test.ts`: GPX/KML parsing, name extraction
- `track-analyzer.test.ts`: distance, elevation, gradient calculations
- `color-mapper.test.ts`: color ramp scaling, gradient expression building
- `camera.test.ts`: zoom calculation, camera path generation

Fixtures: `test/fixtures/sample.gpx`, `test/fixtures/sample.kml`

---

## External Dependencies & Network Access

All tile services are called at render time from inside Puppeteer's Chromium:

| Service | Auth Required | Purpose |
|---|---|---|
| OpenFreeMap | None | Vector map styles |
| OpenTopoMap | None | Topo raster tiles |
| CartoDB | None | Voyager/Positron/Dark tiles |
| AWS Terrarium | None | DEM elevation data (terrain + contours) |
| Mapbox | API token | Satellite imagery only |

No user data is sent to external services; only tile requests from the map renderer.

---

## Notable Design Decisions

1. **Puppeteer + MapLibre for rendering:** Instead of a dedicated map rendering library, the project uses a full headless browser to render MapLibre GL (which requires WebGL), enabling use of the same tile ecosystem and styling as web maps.

2. **FFmpeg stdin pipe:** Video frames are streamed directly to FFmpeg's stdin rather than written to temp files, saving I/O and enabling single-pass encoding.

3. **3-Act narrative structure:** The video isn't a simple camera pan — it has an intentional narrative arc (overview → journey → summary) with synchronized UI transitions.

4. **Multi-pass camera smoothing:** Raw GPS points produce jittery camera paths. The solver applies multiple rolling-window smoothing passes (bearing in sin/cos space to handle wraparound, position, zoom) for cinematic output.

5. **64-stop gradient cap:** MapLibre's WebGL line-gradient shader has a maximum of 64 interpolation stops, so color mapping downsamples to fit this constraint.

6. **Responsive overlay system:** The HTML templates detect portrait vs. landscape orientation and adapt the stats overlay layout via CSS + JavaScript (not just media queries).

7. **Free-tier only by default:** All map styles except `satellite` use free, no-auth tile services, making the tool usable out-of-the-box.

8. **Programmatic API:** All major functions are exported from `src/index.ts`, making the tool embeddable as a library in addition to CLI use.

9. **Chinese UI labels hardcoded:** HTML templates contain "起点" (start), "终点" (end) etc., suggesting primary authorship targeting Chinese users, despite the bilingual README.

---

## Performance Characteristics

| Task | Typical Time |
|---|---|
| Parse + analyze 1000-point track | 50–150ms |
| Static image render | 800–2000ms |
| Video frame render | 200–600ms/frame |
| Video encoding (30s @ 30fps) | 30–120s total |

Memory footprint: Puppeteer browser ~100–200MB during render. FFmpeg encoding: ~50–100MB additional.
