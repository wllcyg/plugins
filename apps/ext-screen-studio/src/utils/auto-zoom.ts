import type { ClickEvent, CursorSample, ZoomSegment } from '../types/recording';

export interface CameraState {
  scale: number;
  centerX: number;
  centerY: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * 根据点击事件自动生成平滑跟焦片段，相邻点击会自动合并为连续跟随段落
 */
export function generateAutoZoomSegments(
  clicks: ClickEvent[],
  durationMs: number,
  defaultScale = 1.75
): ZoomSegment[] {
  if (!clicks.length || durationMs <= 800) return [];

  const sorted = [...clicks].sort((a, b) => a.t - b.t);
  const segments: ZoomSegment[] = [];
  const LEAD_IN = 280;
  const HOLD_AFTER = 1400;
  const MERGE_GAP = 1600;

  for (const click of sorted) {
    const segStart = clamp(click.t - LEAD_IN, 0, durationMs - 400);
    const segEnd = clamp(click.t + HOLD_AFTER, segStart + 700, durationMs);
    const prev = segments[segments.length - 1];

    if (prev && segStart - prev.endMs <= MERGE_GAP) {
      prev.endMs = Math.max(prev.endMs, segEnd);
      prev.followCursor = true;
    } else {
      segments.push({
        id: crypto.randomUUID(),
        startMs: segStart,
        endMs: segEnd,
        scale: defaultScale,
        targetX: clamp(click.x, 0.08, 0.92),
        targetY: clamp(click.y, 0.08, 0.92),
        followCursor: true
      });
    }
  }

  return segments;
}

/**
 * 二分查找指定时间点的光标位置，并对邻近采样做加权平滑以消除手抖微颤
 */
export function sampleCursorAtTime(
  samples: CursorSample[],
  timeMs: number
): { x: number; y: number } | null {
  if (!samples.length) return null;
  if (timeMs <= samples[0].t) return { x: samples[0].x, y: samples[0].y };
  const last = samples[samples.length - 1];
  if (timeMs >= last.t) return { x: last.x, y: last.y };

  let low = 0;
  let high = samples.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (samples[mid].t <= timeMs) low = mid + 1;
    else high = mid - 1;
  }

  const idxA = Math.max(0, high);
  const idxB = Math.min(samples.length - 1, low);
  const a = samples[idxA];
  const b = samples[idxB];
  if (!a || !b) return null;

  const base =
    a.t === b.t
      ? { x: a.x, y: a.y }
      : {
          x: a.x + (b.x - a.x) * ((timeMs - a.t) / (b.t - a.t)),
          y: a.y + (b.y - a.y) * ((timeMs - a.t) / (b.t - a.t))
        };

  // 时间窗口 ±90ms 高斯近似加权平滑，让指针移动更丝滑
  const WINDOW_MS = 90;
  let sumX = base.x * 2;
  let sumY = base.y * 2;
  let weightSum = 2;

  for (let i = Math.max(0, idxA - 4); i <= Math.min(samples.length - 1, idxB + 4); i++) {
    const s = samples[i];
    const dt = Math.abs(s.t - timeMs);
    if (dt <= WINDOW_MS) {
      const w = 1 - dt / WINDOW_MS;
      sumX += s.x * w;
      sumY += s.y * w;
      weightSum += w;
    }
  }

  return {
    x: sumX / weightSum,
    y: sumY / weightSum
  };
}

/**
 * 计算任意时间点的平滑镜头状态（保证放大后不会越界露出黑边）
 */
export function evaluateCameraAtTime(
  timeMs: number,
  segments: ZoomSegment[],
  samples: CursorSample[],
  transitionMs = 420
): CameraState {
  if (!segments.length) {
    return { scale: 1, centerX: 0.5, centerY: 0.5 };
  }

  const active = segments.find((s) => timeMs >= s.startMs && timeMs <= s.endMs);
  if (!active) {
    return { scale: 1, centerX: 0.5, centerY: 0.5 };
  }

  const fade = Math.min(transitionMs, (active.endMs - active.startMs) * 0.4);
  let weight = 1;
  if (timeMs - active.startMs < fade) {
    weight = easeInOutCubic((timeMs - active.startMs) / fade);
  } else if (active.endMs - timeMs < fade) {
    weight = easeInOutCubic((active.endMs - timeMs) / fade);
  }

  let focusX = active.targetX;
  let focusY = active.targetY;
  if (active.followCursor) {
    const cursor = sampleCursorAtTime(samples, timeMs);
    if (cursor) {
      focusX = cursor.x;
      focusY = cursor.y;
    }
  }

  const scale = 1 + (active.scale - 1) * weight;
  // 限制放大窗口中心，确保视口边缘不超出原始画面 [0, 1]
  const halfVisible = 0.5 / scale;
  const clampedX = clamp(focusX, halfVisible, 1 - halfVisible);
  const clampedY = clamp(focusY, halfVisible, 1 - halfVisible);

  return {
    scale,
    centerX: 0.5 + (clampedX - 0.5) * weight,
    centerY: 0.5 + (clampedY - 0.5) * weight
  };
}
