import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { m } from '../locales';
import type { RecordingProject } from '../types/recording';
import { renderStudioFrame, resolveOutputSize } from './canvas-renderer';
import {
  buildPlayableRanges,
  getTotalRangesDuration,
  mapOutputMsToSourceMs
} from './timeline-cuts';

export interface GifExportOptions {
  fps?: number;
  maxWidth?: number;
  speed?: number;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - timeSec) < 0.002) {
      return resolve();
    }
    video.addEventListener('seeked', () => resolve(), { once: true });
    video.currentTime = timeSec;
  });
}

/**
 * 纯本地逐帧编码生成带跟焦动画与背景的高清 GIF 动图
 */
export async function exportStudioGif(
  project: RecordingProject,
  options: GifExportOptions = {}
): Promise<Blob> {
  const fps = options.fps ?? 12;
  const maxWidth = options.maxWidth ?? 960;

  const video = document.createElement('video');
  const videoUrl = URL.createObjectURL(project.videoBlob);
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;

  let cameraVideo: HTMLVideoElement | null = null;
  let cameraUrl = '';
  if (project.cameraBlob && project.style.showCamera) {
    cameraVideo = document.createElement('video');
    cameraUrl = URL.createObjectURL(project.cameraBlob);
    cameraVideo.src = cameraUrl;
    cameraVideo.muted = true;
    cameraVideo.playsInline = true;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error(m.errLoadRecordedVideo));
    });
    if (cameraVideo) {
      await new Promise<void>((resolve) => {
        cameraVideo!.onloadedmetadata = () => resolve();
        cameraVideo!.onerror = () => resolve();
      });
    }

    const durationMs =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration * 1000
        : project.durationMs;

    const trimStartMs = Math.max(0, Math.min(project.trimStartMs ?? 0, durationMs - 200));
    const trimEndMs = Math.max(
      trimStartMs + 200,
      Math.min(project.trimEndMs ?? durationMs, durationMs)
    );
    const speed = Math.max(0.5, Math.min(4, options.speed ?? project.playbackSpeed ?? 1));

    const rawSize = resolveOutputSize(
      video.videoWidth || project.width,
      video.videoHeight || project.height,
      project.style.aspectRatio
    );
    const scaleDown = Math.min(1, maxWidth / rawSize.width);
    const width = Math.max(320, Math.round(rawSize.width * scaleDown));
    const height = Math.max(240, Math.round(rawSize.height * scaleDown));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const gif = GIFEncoder();
    const ranges = buildPlayableRanges(trimStartMs, trimEndMs, project.cutSegments);
    const outDurationMs = getTotalRangesDuration(ranges) / speed;
    const totalFrames = Math.max(1, Math.ceil((outDurationMs / 1000) * fps));
    const delayMs = Math.round(1000 / fps);

    for (let i = 0; i < totalFrames; i++) {
      if (options.signal?.aborted) {
        throw new Error(m.errExportCancelled);
      }

      const srcTimeMs = mapOutputMsToSourceMs((i / fps) * 1000 * speed, ranges);
      const srcSec = srcTimeMs / 1000;

      await seekVideo(video, srcSec);
      if (cameraVideo) await seekVideo(cameraVideo, srcSec);

      renderStudioFrame({
        ctx,
        canvasWidth: width,
        canvasHeight: height,
        video,
        cameraVideo,
        timeMs: srcTimeMs,
        style: project.style,
        segments: project.zoomSegments,
        cursorSamples: project.cursorSamples,
        clickEvents: project.clickEvents,
        keystrokeEvents: project.keystrokeEvents,
        blurRegions: project.blurRegions
      });

      const { data } = ctx.getImageData(0, 0, width, height);
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, width, height, { palette, delay: delayMs });

      options.onProgress?.(Math.min(99, Math.round(((i + 1) / totalFrames) * 100)));
    }

    gif.finish();
    options.onProgress?.(100);
    return new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' });
  } finally {
    URL.revokeObjectURL(videoUrl);
    if (cameraUrl) URL.revokeObjectURL(cameraUrl);
  }
}
