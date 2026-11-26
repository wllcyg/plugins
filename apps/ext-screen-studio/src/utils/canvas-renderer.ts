import {
  BACKDROP_PRESETS,
  type BlurRegion,
  type ClickEvent,
  type CursorSample,
  type KeystrokeEvent,
  type StudioStyleConfig,
  type ZoomSegment
} from '../types/recording';
import { evaluateCameraAtTime, sampleCursorAtTime } from './auto-zoom';

export interface RenderFrameParams {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  video: HTMLVideoElement;
  cameraVideo?: HTMLVideoElement | null;
  timeMs: number;
  style: StudioStyleConfig;
  segments: ZoomSegment[];
  cursorSamples: CursorSample[];
  clickEvents: ClickEvent[];
  keystrokeEvents?: KeystrokeEvent[];
  blurRegions?: BlurRegion[];
}

function computeFrameLayout(
  cw: number,
  ch: number,
  vw: number,
  vh: number,
  style: StudioStyleConfig
) {
  const pad = (style.padding / 1920) * cw;
  const frameMode = style.windowFrame ?? 'none';
  const titleBarH = frameMode !== 'none' ? Math.round((40 / 1920) * cw) : 0;
  const availW = Math.max(100, cw - pad * 2);
  const availH = Math.max(100, ch - pad * 2 - titleBarH);
  const fitRatio = Math.min(availW / vw, availH / vh);
  const destW = vw * fitRatio;
  const destH = vh * fitRatio;
  const cardW = destW;
  const cardH = destH + titleBarH;
  const cardX = (cw - cardW) / 2;
  const cardY = (ch - cardH) / 2;
  const destX = cardX;
  const destY = cardY + titleBarH;
  const radius = (style.borderRadius / 1920) * cw;
  return { pad, titleBarH, cardX, cardY, cardW, cardH, destX, destY, destW, destH, radius, frameMode };
}

export function canvasPointToVideoNorm(
  normCanvasX: number,
  normCanvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  videoWidth: number,
  videoHeight: number,
  timeMs: number,
  style: StudioStyleConfig,
  segments: ZoomSegment[],
  cursorSamples: CursorSample[]
): { x: number; y: number } {
  const { destX, destY, destW, destH } = computeFrameLayout(
    canvasWidth,
    canvasHeight,
    videoWidth,
    videoHeight,
    style
  );

  const px = normCanvasX * canvasWidth;
  const py = normCanvasY * canvasHeight;
  const relDestX = Math.max(0, Math.min(1, (px - destX) / destW));
  const relDestY = Math.max(0, Math.min(1, (py - destY) / destH));

  const cam = evaluateCameraAtTime(timeMs, segments, cursorSamples, style.transitionMs);
  const vx = cam.centerX - 0.5 / cam.scale + relDestX / cam.scale;
  const vy = cam.centerY - 0.5 / cam.scale + relDestY / cam.scale;
  return {
    x: Math.max(0, Math.min(1, vx)),
    y: Math.max(0, Math.min(1, vy))
  };
}

export function resolveOutputSize(
  videoWidth: number,
  videoHeight: number,
  aspectRatio: StudioStyleConfig['aspectRatio']
): { width: number; height: number } {
  const baseW = Math.max(1280, Math.min(1920, videoWidth || 1920));
  switch (aspectRatio) {
    case '16:9':
      return { width: baseW, height: Math.round((baseW * 9) / 16) };
    case '4:3':
      return { width: baseW, height: Math.round((baseW * 3) / 4) };
    case '1:1': {
      const side = Math.min(baseW, 1440);
      return { width: side, height: side };
    }
    case '9:16':
      return { width: 1080, height: 1920 };
    case 'auto':
    default: {
      const ratio = videoWidth && videoHeight ? videoWidth / videoHeight : 16 / 9;
      return { width: baseW, height: Math.round(baseW / ratio) };
    }
  }
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: StudioStyleConfig
): void {
  const preset = BACKDROP_PRESETS.find((b) => b.id === style.backdropId) ?? BACKDROP_PRESETS[0];
  const stops =
    style.backdropId === 'custom'
      ? [style.customGradientStart, style.customGradientEnd]
      : preset.stops;

  const rad = (preset.angle * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 2;
  const len = Math.hypot(w, h) / 2;
  const grad = ctx.createLinearGradient(
    cx - Math.cos(rad) * len,
    cy - Math.sin(rad) * len,
    cx + Math.cos(rad) * len,
    cy + Math.sin(rad) * len
  );

  stops.forEach((color, idx) => {
    grad.addColorStop(idx / Math.max(1, stops.length - 1), color);
  });

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawCursorArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 22);
  ctx.lineTo(6, 17);
  ctx.lineTo(11, 26);
  ctx.lineTo(14.5, 24.5);
  ctx.lineTo(9.5, 15.5);
  ctx.lineTo(16.5, 15);
  ctx.closePath();

  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#0f172a';
  ctx.stroke();
  ctx.restore();
}

export function renderStudioFrame(params: RenderFrameParams): void {
  const {
    ctx,
    canvasWidth: cw,
    canvasHeight: ch,
    video,
    cameraVideo,
    timeMs,
    style,
    segments,
    cursorSamples,
    clickEvents,
    keystrokeEvents,
    blurRegions
  } = params;

  drawBackdrop(ctx, cw, ch, style);

  const vw = video.videoWidth || 1920;
  const vh = video.videoHeight || 1080;

  const {
    pad,
    titleBarH,
    cardX,
    cardY,
    cardW,
    cardH,
    destX,
    destY,
    destW,
    destH,
    radius,
    frameMode
  } = computeFrameLayout(cw, ch, vw, vh, style);

  // 渲染外层卡片阴影
  if (style.shadowIntensity > 0) {
    ctx.save();
    drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.shadowColor = `rgba(15, 23, 42, ${style.shadowIntensity})`;
    ctx.shadowBlur = (56 / 1920) * cw;
    ctx.shadowOffsetY = (20 / 1920) * cw;
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();
  }

  // 裁剪整张卡片圆角并绘制 macOS 窗口标题栏
  ctx.save();
  drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.clip();

  if (frameMode !== 'none' && titleBarH > 0) {
    const isLight = frameMode === 'macos-light';
    ctx.fillStyle = isLight ? '#f1f5f9' : '#1e1e22';
    ctx.fillRect(cardX, cardY, cardW, titleBarH);

    const dotY = cardY + titleBarH / 2;
    const dotR = Math.max(4, (6.5 / 1920) * cw);
    const dotGap = dotR * 3.1;
    const dotStartX = cardX + Math.max(16, (22 / 1920) * cw);
    const dotColors = ['#ff5f56', '#ffbd2e', '#27c93f'];
    dotColors.forEach((color, idx) => {
      ctx.beginPath();
      ctx.arc(dotStartX + idx * dotGap, dotY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(cardX, cardY + titleBarH - 1, cardW, 1);
  }

  // 裁剪视频内部区域并绘制缩放后的视频画面
  const cam = evaluateCameraAtTime(timeMs, segments, cursorSamples, style.transitionMs);
  const srcW = vw / cam.scale;
  const srcH = vh / cam.scale;
  const srcX = (cam.centerX - 0.5 / cam.scale) * vw;
  const srcY = (cam.centerY - 0.5 / cam.scale) * vh;

  ctx.beginPath();
  ctx.rect(destX, destY, destW, destH);
  ctx.clip();

  if (video.readyState >= 2) {
    ctx.drawImage(video, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
  }

  // 映射标准化坐标到当前放大后的画面坐标
  const mapNormToDest = (nx: number, ny: number) => {
    const px = ((nx * vw - srcX) / srcW) * destW + destX;
    const py = ((ny * vh - srcY) / srcH) * destH + destY;
    return { px, py };
  };

  // 绘制局部隐私模糊遮罩（随缩放自动跟随）
  if (blurRegions?.length && video.readyState >= 2) {
    for (const region of blurRegions) {
      const topLeft = mapNormToDest(region.x, region.y);
      const bottomRight = mapNormToDest(region.x + region.w, region.y + region.h);
      const bx = topLeft.px;
      const by = topLeft.py;
      const bw = bottomRight.px - bx;
      const bh = bottomRight.py - by;
      if (bw <= 1 || bh <= 1) continue;

      ctx.save();
      drawRoundedRectPath(ctx, bx, by, bw, bh, Math.max(4, 8 * (cw / 1920)));
      ctx.clip();
      ctx.filter = `blur(${Math.max(4, region.strength * (cw / 1920))}px)`;
      ctx.drawImage(video, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(20, 20, 22, 0.14)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.restore();
    }
  }

  // 绘制点击波纹
  if (style.showClickRipple) {
    const RIPPLE_LIFE = 550;
    for (const click of clickEvents) {
      const age = timeMs - click.t;
      if (age >= 0 && age <= RIPPLE_LIFE) {
        const progress = age / RIPPLE_LIFE;
        const { px, py } = mapNormToDest(click.x, click.y);
        const r = (10 + progress * 36) * (cw / 1920) * style.cursorSize;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.strokeStyle = style.rippleColor;
        ctx.globalAlpha = 1 - progress;
        ctx.lineWidth = 3 * (cw / 1920);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // 绘制高清矢量指针
  if (style.showCursor) {
    const cursor = sampleCursorAtTime(cursorSamples, timeMs);
    if (cursor) {
      const { px, py } = mapNormToDest(cursor.x, cursor.y);
      drawCursorArrow(ctx, px, py, (cw / 1920) * style.cursorSize);
    }
  }

  ctx.restore();

  // 绘制摄像头画中画
  if (style.showCamera && cameraVideo && cameraVideo.readyState >= 2) {
    const camBoxSize = (style.cameraSize / 100) * Math.min(cw, ch);
    const margin = Math.max(24, pad * 0.75);
    let cx = cw - margin - camBoxSize;
    let cy = ch - margin - camBoxSize;

    if (style.cameraCorner === 'bottom-left') {
      cx = margin;
    } else if (style.cameraCorner === 'top-right') {
      cy = margin;
    } else if (style.cameraCorner === 'top-left') {
      cx = margin;
      cy = margin;
    }

    const camR = (style.cameraRoundness / 100) * camBoxSize;
    ctx.save();
    drawRoundedRectPath(ctx, cx, cy, camBoxSize, camBoxSize, camR);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundedRectPath(ctx, cx, cy, camBoxSize, camBoxSize, camR);
    ctx.clip();

    const cvw = cameraVideo.videoWidth || 640;
    const cvh = cameraVideo.videoHeight || 480;
    const side = Math.min(cvw, cvh);
    const csx = (cvw - side) / 2;
    const csy = (cvh - side) / 2;

    // 镜像绘制摄像头，符合自拍直觉
    ctx.translate(cx + camBoxSize, cy);
    ctx.scale(-1, 1);
    ctx.drawImage(cameraVideo, csx, csy, side, side, 0, 0, camBoxSize, camBoxSize);
    ctx.restore();

    ctx.save();
    drawRoundedRectPath(ctx, cx, cy, camBoxSize, camBoxSize, camR);
    ctx.lineWidth = Math.max(2, cw * 0.0025);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.stroke();
    ctx.restore();
  }

  // 绘制键盘快捷键悬浮胶囊
  if ((style.showKeystrokes ?? true) && keystrokeEvents?.length) {
    const KEY_LIFE = 1200;
    const latest = [...keystrokeEvents]
      .reverse()
      .find((k) => timeMs >= k.t && timeMs - k.t <= KEY_LIFE);

    if (latest) {
      const age = timeMs - latest.t;
      const alpha = age > KEY_LIFE - 260 ? Math.max(0, (KEY_LIFE - age) / 260) : 1;
      const fontSize = Math.round(22 * (cw / 1920));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      const textW = ctx.measureText(latest.label).width;
      const padX = fontSize * 0.9;
      const boxH = fontSize * 2.05;
      const boxW = textW + padX * 2;
      const bx = (cw - boxW) / 2;
      const by = destY + destH - boxH - Math.max(20, (28 / 1920) * cw);

      drawRoundedRectPath(ctx, bx, by, boxW, boxH, boxH * 0.28);
      ctx.fillStyle = 'rgba(20, 20, 22, 0.86)';
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, cw * 0.0012);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();

      ctx.fillStyle = '#f4f4f5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(latest.label, cw / 2, by + boxH / 2 + 1);
      ctx.restore();
    }
  }

  // 绘制个人署名防盗水印
  const wm = style.watermarkText?.trim();
  if (wm) {
    const fontSize = Math.max(12, Math.round(18 * (cw / 1920)));
    const margin = Math.max(16, (24 / 1920) * cw);
    const hasCamBottomRight =
      style.showCamera && cameraVideo && cameraVideo.readyState >= 2 && style.cameraCorner === 'bottom-right';
    ctx.save();
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 4;
    ctx.textBaseline = 'bottom';
    if (hasCamBottomRight) {
      ctx.textAlign = 'left';
      ctx.fillText(wm, margin, ch - margin * 0.7);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(wm, cw - margin, ch - margin * 0.7);
    }
    ctx.restore();
  }
}
