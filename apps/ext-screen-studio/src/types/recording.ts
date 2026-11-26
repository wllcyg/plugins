export interface CursorSample {
  /** 距离录制开始的相对时间（毫秒） */
  t: number;
  /** 相对视口归一化的 X 坐标 (0 ~ 1) */
  x: number;
  /** 相对视口归一化的 Y 坐标 (0 ~ 1) */
  y: number;
}

export interface ClickEvent {
  t: number;
  x: number;
  y: number;
  button: number;
}

export interface KeystrokeEvent {
  t: number;
  label: string;
}

export interface BlurRegion {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  strength: number;
}

export interface ZoomSegment {
  id: string;
  startMs: number;
  endMs: number;
  /** 缩放倍率，例如 1.8 */
  scale: number;
  /** 焦点归一化坐标 (0 ~ 1) */
  targetX: number;
  targetY: number;
  /** 是否自动跟随该时段内的光标移动 */
  followCursor: boolean;
}

export type AspectRatioPreset = 'auto' | '16:9' | '4:3' | '1:1' | '9:16';
export type CameraCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type WindowFrameStyle = 'none' | 'macos-dark' | 'macos-light';

export interface CutSegment {
  id: string;
  startMs: number;
  endMs: number;
}

export interface StudioStyleConfig {
  aspectRatio: AspectRatioPreset;
  padding: number;
  borderRadius: number;
  shadowIntensity: number;
  backdropId: string;
  customGradientStart: string;
  customGradientEnd: string;
  showCursor: boolean;
  cursorSize: number;
  showClickRipple: boolean;
  rippleColor: string;
  showKeystrokes?: boolean;
  transitionMs: number;
  showCamera: boolean;
  cameraCorner: CameraCorner;
  cameraSize: number;
  cameraRoundness: number;
  windowFrame?: WindowFrameStyle;
  watermarkText?: string;
}

export interface BackdropPreset {
  id: string;
  name: string;
  stops: [string, string, ...string[]];
  angle: number;
}

export interface RecordingProject {
  id: string;
  title: string;
  createdAt: number;
  durationMs: number;
  trimStartMs?: number;
  trimEndMs?: number;
  playbackSpeed?: number;
  width: number;
  height: number;
  videoBlob: Blob;
  cameraBlob?: Blob;
  cursorSamples: CursorSample[];
  clickEvents: ClickEvent[];
  keystrokeEvents?: KeystrokeEvent[];
  blurRegions?: BlurRegion[];
  cutSegments?: CutSegment[];
  zoomSegments: ZoomSegment[];
  style: StudioStyleConfig;
}

export const BACKDROP_PRESETS: BackdropPreset[] = [
  { id: 'aurora', name: '极光紫魅', stops: ['#4f46e5', '#7c3aed', '#ec4899'], angle: 135 },
  { id: 'ocean', name: '深海蓝调', stops: ['#0f172a', '#1d4ed8', '#06b6d4'], angle: 135 },
  { id: 'sunset', name: '落日熔金', stops: ['#f97316', '#ef4444', '#a855f7'], angle: 125 },
  { id: 'mint', name: '薄荷微风', stops: ['#10b981', '#0d9488', '#0284c7'], angle: 135 },
  { id: 'obsidian', name: '暗夜黑曜', stops: ['#09090b', '#18181b', '#27272a'], angle: 145 },
  { id: 'mac-light', name: '磨砂浅灰', stops: ['#e2e8f0', '#f8fafc', '#cbd5e1'], angle: 135 },
  { id: 'custom', name: '自定义渐变', stops: ['#6366f1', '#ec4899'], angle: 135 }
];

export const DEFAULT_STYLE_CONFIG: StudioStyleConfig = {
  aspectRatio: '16:9',
  padding: 56,
  borderRadius: 18,
  shadowIntensity: 0.45,
  backdropId: 'aurora',
  customGradientStart: '#6366f1',
  customGradientEnd: '#ec4899',
  showCursor: true,
  cursorSize: 1.25,
  showClickRipple: true,
  rippleColor: '#f43f5e',
  showKeystrokes: true,
  transitionMs: 420,
  showCamera: true,
  cameraCorner: 'bottom-right',
  cameraSize: 18,
  cameraRoundness: 50,
  windowFrame: 'macos-dark',
  watermarkText: ''
};
