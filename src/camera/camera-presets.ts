import type { Perspective } from "../types/index.js";

export interface CameraPreset {
  pitch: number;
  bearing: number;
}

export function getCameraPreset(perspective: Perspective): CameraPreset {
  switch (perspective) {
    case "overhead":
      return { pitch: 0, bearing: 0 };
    case "north-up":
      return { pitch: 0, bearing: 0 };
    case "auto":
    default:
      return { pitch: 0, bearing: 0 };
  }
}
