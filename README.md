# geoshot

**[English](#english) | [中文](#chinese)**

---

<a name="english"></a>

## English

**geoshot** is a CLI tool that converts GPX/KML track files into beautiful map images and cinematic flythrough videos.

### Features

- Render GPS tracks as high-resolution map **images** (PNG, JPG, WebP)
- Render cinematic **flythrough videos** (MP4) with 3D terrain and camera animation
- Color tracks by **elevation**, **speed**, **gradient**, **distance**, or a solid color
- Multiple **color ramps**: turbo, viridis, plasma, inferno, rdylgn
- Multiple **map styles**: topo, liberty, bright, positron, outdoor, dark, light, satellite
- Stats **overlay** with elevation and speed profile charts
- Start/end/peak **markers** and km distance markers
- **Contour lines** support
- **3D terrain** rendering (video mode)
- Optional **background music** (video mode)
- Machine-readable **JSON output** mode

### Installation

```bash
npm install -g geoshot
# or run directly with npx
npx geoshot --help
```

Requires **Node.js 18+**.

### Commands

#### `geoshot info`

Show track statistics and metadata for a GPX or KML file.

```bash
geoshot info -i track.gpx
geoshot info -i track.kml --output-format json
```

#### `geoshot image`

Render a track to a static map image.

```bash
geoshot image -i track.gpx -o map.png
geoshot image -i track.gpx -o map.jpg --style outdoor --color-by speed
geoshot image -i track.gpx -o poster.png -w 1080 -h 1920 --style dark --color-ramp viridis
```

#### `geoshot video`

Render an animated flythrough video of the track.

```bash
geoshot video -i track.gpx -o flythrough.mp4
geoshot video -i track.gpx -o flythrough.mp4 --duration 60 --fps 30 --style topo
geoshot video -i track.gpx -o flythrough.mp4 --terrain --music builtin
```

### Options

#### Common options (all commands)

| Option | Default | Description |
|--------|---------|-------------|
| `-i, --input <file>` | *(required)* | Input GPX or KML file |
| `--output-format <format>` | `human` | Output format: `human` or `json` |
| `-q, --quiet` | `false` | Suppress non-essential output |

#### Image options

| Option | Default | Description |
|--------|---------|-------------|
| `-o, --output <file>` | *(required)* | Output image file (png, jpg, webp) |
| `-w, --width <pixels>` | `1080` | Image width |
| `-h, --height <pixels>` | `1920` | Image height |
| `--dpi <scale>` | `2` | Device pixel ratio |
| `--color-by <metric>` | `elevation` | Color by: `elevation`, `speed`, `gradient`, `distance`, `none` |
| `--color-ramp <ramp>` | `turbo` | Color ramp: `turbo`, `viridis`, `plasma`, `inferno`, `rdylgn` |
| `--style <style>` | `topo` | Map style: `topo`, `liberty`, `bright`, `positron`, `outdoor`, `dark`, `light`, `satellite` |
| `--perspective <view>` | `auto` | Camera: `auto`, `overhead`, `north-up` |
| `--track-width <width>` | `5` | Track line width in pixels |
| `--track-color <color>` | `#3b82f6` | Solid track color (hex), used with `--color-by none` |
| `--[no-]markers` | on | Show/hide start/end markers |
| `--padding <pixels>` | `60` | Map padding around track |
| `--mapbox-token <token>` | — | Mapbox access token (required for `satellite` style) |
| `--[no-]contours` | on | Show/hide contour lines |
| `--[no-]overlay` | on | Show/hide stats overlay |
| `--overlay-title <text>` | track name | Custom title for the overlay |

#### Video options (all image options, plus)

| Option | Default | Description |
|--------|---------|-------------|
| `--duration <seconds>` | `30` | Video duration in seconds |
| `--fps <rate>` | `30` | Frames per second |
| `--[no-]terrain` | on | Enable/disable 3D terrain |
| `--music <type>` | `builtin` | Music: `builtin` or `none` |
| `--music-file <path>` | — | Custom background music file (mp3) |

### Examples

```bash
# Quick map image of a hike
geoshot image -i hike.gpx -o hike.png

# Dark-themed poster colored by gradient
geoshot image -i ride.gpx -o poster.png --style dark --color-by gradient --color-ramp rdylgn

# 60-second cinematic video with 3D terrain
geoshot video -i trail.gpx -o trail.mp4 --duration 60 --terrain --style outdoor

# Satellite style image (requires Mapbox token)
geoshot image -i run.gpx -o run.png --style satellite --mapbox-token YOUR_TOKEN

# JSON output for scripting
geoshot info -i track.gpx --output-format json
```

### Building from source

```bash
git clone https://github.com/your-username/geoshot.git
cd geoshot
npm install
npm run build
npm start -- image -i track.gpx -o out.png
```

### Tech stack

- **TypeScript** + **Node.js**
- **Puppeteer** — headless browser for map rendering
- **MapLibre GL JS** — vector map rendering engine
- **FFmpeg** — video encoding
- **Turf.js** — geospatial analysis
- **@tmcw/togeojson** — GPX/KML parsing
- **Commander** — CLI framework

---

<a name="chinese"></a>

## 中文

**geoshot** 是一个命令行工具，可将 GPX/KML 轨迹文件转换为精美的地图图片和电影级飞越视频。

### 功能特性

- 将 GPS 轨迹渲染为高分辨率地图**图片**（PNG、JPG、WebP）
- 渲染带有 3D 地形和镜头动画的**飞越视频**（MP4）
- 按**海拔**、**速度**、**坡度**、**距离**或纯色对轨迹着色
- 多种**色彩方案**：turbo、viridis、plasma、inferno、rdylgn
- 多种**地图样式**：topo（等高线）、liberty、bright、positron、outdoor、dark、light、satellite（卫星图）
- 包含海拔和速度曲线图的统计**叠加层**
- 起点/终点/最高点**标记**及公里里程标记
- **等高线**支持
- **3D 地形**渲染（视频模式）
- 可选**背景音乐**（视频模式）
- 机器可读的 **JSON 输出**模式

### 安装

```bash
npm install -g geoshot
# 或直接使用 npx 运行
npx geoshot --help
```

需要 **Node.js 18+**。

### 命令

#### `geoshot info`

显示 GPX 或 KML 文件的轨迹统计信息和元数据。

```bash
geoshot info -i track.gpx
geoshot info -i track.kml --output-format json
```

#### `geoshot image`

将轨迹渲染为静态地图图片。

```bash
geoshot image -i track.gpx -o map.png
geoshot image -i track.gpx -o map.jpg --style outdoor --color-by speed
geoshot image -i track.gpx -o poster.png -w 1080 -h 1920 --style dark --color-ramp viridis
```

#### `geoshot video`

渲染轨迹的动态飞越视频。

```bash
geoshot video -i track.gpx -o flythrough.mp4
geoshot video -i track.gpx -o flythrough.mp4 --duration 60 --fps 30 --style topo
geoshot video -i track.gpx -o flythrough.mp4 --terrain --music builtin
```

### 选项说明

#### 通用选项（所有命令）

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `-i, --input <file>` | *(必填)* | 输入的 GPX 或 KML 文件 |
| `--output-format <format>` | `human` | 输出格式：`human`（易读）或 `json` |
| `-q, --quiet` | `false` | 抑制非必要输出 |

#### 图片选项

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `-o, --output <file>` | *(必填)* | 输出图片文件（png、jpg、webp） |
| `-w, --width <pixels>` | `1080` | 图片宽度（像素） |
| `-h, --height <pixels>` | `1920` | 图片高度（像素） |
| `--dpi <scale>` | `2` | 设备像素比 |
| `--color-by <metric>` | `elevation` | 着色依据：`elevation`（海拔）、`speed`（速度）、`gradient`（坡度）、`distance`（距离）、`none`（纯色） |
| `--color-ramp <ramp>` | `turbo` | 色彩方案：`turbo`、`viridis`、`plasma`、`inferno`、`rdylgn` |
| `--style <style>` | `topo` | 地图样式：`topo`、`liberty`、`bright`、`positron`、`outdoor`、`dark`、`light`、`satellite` |
| `--perspective <view>` | `auto` | 相机视角：`auto`（自动）、`overhead`（俯视）、`north-up`（正北朝上） |
| `--track-width <width>` | `5` | 轨迹线宽（像素） |
| `--track-color <color>` | `#3b82f6` | 纯色轨迹颜色（十六进制），与 `--color-by none` 配合使用 |
| `--[no-]markers` | 开启 | 显示/隐藏起终点标记 |
| `--padding <pixels>` | `60` | 轨迹周围的地图边距 |
| `--mapbox-token <token>` | — | Mapbox 访问令牌（卫星图样式必填） |
| `--[no-]contours` | 开启 | 显示/隐藏等高线 |
| `--[no-]overlay` | 开启 | 显示/隐藏统计叠加层 |
| `--overlay-title <text>` | 轨迹名称 | 叠加层的自定义标题 |

#### 视频选项（包含所有图片选项，另加以下）

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `--duration <seconds>` | `30` | 视频时长（秒） |
| `--fps <rate>` | `30` | 帧率 |
| `--[no-]terrain` | 开启 | 启用/禁用 3D 地形 |
| `--music <type>` | `builtin` | 背景音乐：`builtin`（内置）或 `none`（无） |
| `--music-file <path>` | — | 自定义背景音乐文件（mp3） |

### 使用示例

```bash
# 快速生成徒步地图图片
geoshot image -i hike.gpx -o hike.png

# 按坡度着色的深色主题海报
geoshot image -i ride.gpx -o poster.png --style dark --color-by gradient --color-ramp rdylgn

# 带 3D 地形的 60 秒电影级视频
geoshot video -i trail.gpx -o trail.mp4 --duration 60 --terrain --style outdoor

# 卫星图样式（需要 Mapbox 令牌）
geoshot image -i run.gpx -o run.png --style satellite --mapbox-token YOUR_TOKEN

# JSON 格式输出（适合脚本处理）
geoshot info -i track.gpx --output-format json
```

### 从源码构建

```bash
git clone https://github.com/your-username/geoshot.git
cd geoshot
npm install
npm run build
npm start -- image -i track.gpx -o out.png
```

### 技术栈

- **TypeScript** + **Node.js**
- **Puppeteer** — 无头浏览器，用于地图渲染
- **MapLibre GL JS** — 矢量地图渲染引擎
- **FFmpeg** — 视频编码
- **Turf.js** — 地理空间分析
- **@tmcw/togeojson** — GPX/KML 文件解析
- **Commander** — CLI 框架
