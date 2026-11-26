import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import type { RecordingProject } from '../types/recording';
import { renderStudioFrame, resolveOutputSize } from './canvas-renderer';
import {
  buildPlayableRanges,
  getTotalRangesDuration,
  mapOutputMsToSourceMs,
  type TimeRange
} from './timeline-cuts';

export interface ExportOptions {
  fps?: number;
  bitrate?: number;
  speed?: number;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - timeSec) < 0.002) {
      return resolve();
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = timeSec;
  });
}

async function encodeAudioTrack(
  videoBlob: Blob,
  ranges: TimeRange[],
  speed: number,
  muxer: Muxer<ArrayBufferTarget>
): Promise<void> {
  if (typeof AudioEncoder === 'undefined') return;
  let audioCtx: AudioContext | null = null;
  try {
    const rawBuf = await videoBlob.arrayBuffer();
    audioCtx = new AudioContext();
    const decoded = await audioCtx.decodeAudioData(rawBuf);
    const sampleRate = decoded.sampleRate;
    const channels = Math.min(2, decoded.numberOfChannels);

    const support = await AudioEncoder.isConfigSupported({
      codec: 'mp4a.40.2',
      numberOfChannels: channels,
      sampleRate,
      bitrate: 128_000
    });
    if (!support.supported) return;

    const encoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: () => {}
    });
    encoder.configure({
      codec: 'mp4a.40.2',
      numberOfChannels: channels,
      sampleRate,
      bitrate: 128_000
    });

    const totalSrcMs = getTotalRangesDuration(ranges);
    const totalOutSamples = Math.floor(((totalSrcMs / 1000) * sampleRate) / speed);
    if (!totalOutSamples) {
      encoder.close();
      return;
    }

    const CHUNK_FRAMES = 1024;
    for (let offset = 0; offset < totalOutSamples; offset += CHUNK_FRAMES) {
      const frames = Math.min(CHUNK_FRAMES, totalOutSamples - offset);
      const planar = new Float32Array(frames * channels);

      for (let ch = 0; ch < channels; ch++) {
        const srcData = decoded.getChannelData(ch);
        const chOffset = ch * frames;
        for (let i = 0; i < frames; i++) {
          const outMs = ((offset + i) / sampleRate) * 1000;
          const srcMs = mapOutputMsToSourceMs(outMs * speed, ranges);
          const srcIdx = Math.min(decoded.length - 1, Math.max(0, Math.floor((srcMs / 1000) * sampleRate)));
          planar[chOffset + i] = srcData[srcIdx] ?? 0;
        }
      }

      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate,
        numberOfFrames: frames,
        numberOfChannels: channels,
        timestamp: Math.round((offset / sampleRate) * 1_000_000),
        data: planar
      });
      encoder.encode(audioData);
      audioData.close();
    }

    await encoder.flush();
    encoder.close();
  } catch {
    // 无音轨或浏览器不支持 AAC AudioEncoder 时静默忽略
  } finally {
    if (audioCtx) void audioCtx.close().catch(() => {});
  }
}

async function exportWithWebCodecs(
  project: RecordingProject,
  video: HTMLVideoElement,
  cameraVideo: HTMLVideoElement | null,
  width: number,
  height: number,
  trimStartMs: number,
  trimEndMs: number,
  speed: number,
  fps: number,
  bitrate: number,
  options: ExportOptions
): Promise<{ blob: Blob; ext: 'mp4' }> {
  // H.264 要求宽高均为偶数
  const encW = width & ~1;
  const encH = height & ~1;

  const videoConfig: VideoEncoderConfig = {
    codec: 'avc1.4d002a',
    width: encW,
    height: encH,
    bitrate,
    framerate: fps
  };
  const support = await VideoEncoder.isConfigSupported(videoConfig);
  if (!support.supported) {
    throw new Error('WebCodecs H.264 unavailable');
  }

  let hasAudio = false;
  if (typeof AudioEncoder !== 'undefined') {
    try {
      const testCtx = new AudioContext();
      const buf = await project.videoBlob.slice(0, project.videoBlob.size).arrayBuffer();
      const decoded = await testCtx.decodeAudioData(buf);
      hasAudio = decoded.numberOfChannels > 0;
      await testCtx.close();
    } catch {
      hasAudio = false;
    }
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: encW, height: encH },
    audio: hasAudio
      ? { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 }
      : undefined,
    fastStart: 'in-memory'
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      throw err;
    }
  });
  encoder.configure(videoConfig);

  const canvas = document.createElement('canvas');
  canvas.width = encW;
  canvas.height = encH;
  const ctx = canvas.getContext('2d')!;

  const ranges = buildPlayableRanges(trimStartMs, trimEndMs, project.cutSegments);
  const clipSpanMs = getTotalRangesDuration(ranges);
  const outputDurationMs = clipSpanMs / speed;
  const totalFrames = Math.max(1, Math.ceil((outputDurationMs / 1000) * fps));
  const frameDurationUs = Math.round(1_000_000 / fps);

  for (let i = 0; i < totalFrames; i++) {
    if (options.signal?.aborted) {
      encoder.close();
      throw new Error('已取消导出');
    }

    const outTimeMs = (i / fps) * 1000;
    const srcTimeMs = mapOutputMsToSourceMs(outTimeMs * speed, ranges);
    const srcSec = srcTimeMs / 1000;

    await seekVideo(video, srcSec);
    if (cameraVideo) await seekVideo(cameraVideo, srcSec);

    renderStudioFrame({
      ctx,
      canvasWidth: encW,
      canvasHeight: encH,
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

    const frame = new VideoFrame(canvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs
    });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();

    if (encoder.encodeQueueSize > 8) {
      await encoder.flush();
    }

    options.onProgress?.(Math.min(95, Math.round(((i + 1) / totalFrames) * 95)));
  }

  await encoder.flush();
  encoder.close();

  if (hasAudio) {
    await encodeAudioTrack(project.videoBlob, ranges, speed, muxer);
  }

  options.onProgress?.(100);
  muxer.finalize();
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), ext: 'mp4' };
}

function pickSupportedMimeType(): { mimeType: string; ext: 'mp4' | 'webm' } {
  const candidates: Array<{ mimeType: string; ext: 'mp4' | 'webm' }> = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
    { mimeType: 'video/mp4', ext: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', ext: 'webm' },
    { mimeType: 'video/webm', ext: 'webm' }
  ];
  for (const item of candidates) {
    if (MediaRecorder.isTypeSupported(item.mimeType)) return item;
  }
  return { mimeType: 'video/webm', ext: 'webm' };
}

async function exportWithMediaRecorder(
  project: RecordingProject,
  video: HTMLVideoElement,
  cameraVideo: HTMLVideoElement | null,
  width: number,
  height: number,
  trimStartMs: number,
  trimEndMs: number,
  speed: number,
  fps: number,
  bitrate: number,
  options: ExportOptions
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  video.playbackRate = speed;
  if (cameraVideo) cameraVideo.playbackRate = speed;

  const canvasStream = canvas.captureStream(fps);
  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

  let audioCtx: AudioContext | null = null;
  try {
    audioCtx = new AudioContext();
    const srcNode = audioCtx.createMediaElementSource(video);
    const destNode = audioCtx.createMediaStreamDestination();
    srcNode.connect(destNode);
    const audioTrack = destNode.stream.getAudioTracks()[0];
    if (audioTrack) tracks.push(audioTrack);
  } catch {
    // 无音轨时静默降级
  }

  const combinedStream = new MediaStream(tracks);
  const { mimeType, ext } = pickSupportedMimeType();
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: bitrate
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const clipSpanMs = trimEndMs - trimStartMs;

  return new Promise((resolve, reject) => {
    let rafId = 0;
    let stopped = false;

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      tracks.forEach((t) => t.stop());
      if (audioCtx) void audioCtx.close().catch(() => {});
    };

    const onAbort = () => {
      if (stopped) return;
      stopped = true;
      if (recorder.state !== 'inactive') recorder.stop();
      video.pause();
      cameraVideo?.pause();
      cleanup();
      reject(new Error('已取消导出'));
    };

    options.signal?.addEventListener('abort', onAbort, { once: true });

    recorder.onstop = () => {
      if (stopped) return;
      stopped = true;
      cleanup();
      resolve({ blob: new Blob(chunks, { type: mimeType }), ext });
    };

    recorder.onerror = () => {
      if (stopped) return;
      stopped = true;
      cleanup();
      reject(new Error('视频编码导出失败'));
    };

    video.currentTime = trimStartMs / 1000;
    if (cameraVideo) cameraVideo.currentTime = trimStartMs / 1000;

    const drawLoop = () => {
      if (stopped) return;
      const currentMs = video.currentTime * 1000;
      renderStudioFrame({
        ctx,
        canvasWidth: width,
        canvasHeight: height,
        video,
        cameraVideo,
        timeMs: currentMs,
        style: project.style,
        segments: project.zoomSegments,
        cursorSamples: project.cursorSamples,
        clickEvents: project.clickEvents,
        keystrokeEvents: project.keystrokeEvents,
        blurRegions: project.blurRegions
      });

      const pct = Math.min(
        99,
        Math.max(0, Math.round(((currentMs - trimStartMs) / Math.max(1, clipSpanMs)) * 100))
      );
      options.onProgress?.(pct);

      if (video.ended || currentMs >= trimEndMs) {
        options.onProgress?.(100);
        if (recorder.state !== 'inactive') recorder.stop();
        return;
      }
      rafId = requestAnimationFrame(drawLoop);
    };

    recorder.start(250);
    void video.play().then(() => {
      if (cameraVideo) void cameraVideo.play().catch(() => {});
      rafId = requestAnimationFrame(drawLoop);
    });
  });
}

/**
 * 优先采用 WebCodecs + mp4-muxer 极速离屏编码 MP4，不支持时自动降级 MediaRecorder
 */
export async function exportStudioVideo(
  project: RecordingProject,
  options: ExportOptions = {}
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const fps = options.fps ?? 60;
  const bitrate = options.bitrate ?? 12_000_000;

  const video = document.createElement('video');
  const videoUrl = URL.createObjectURL(project.videoBlob);
  video.src = videoUrl;
  video.playsInline = true;
  video.muted = false;
  video.volume = 1;

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
      video.onerror = () => reject(new Error('无法加载录制视频'));
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

    const { width, height } = resolveOutputSize(
      video.videoWidth || project.width,
      video.videoHeight || project.height,
      project.style.aspectRatio
    );

    if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
      try {
        return await exportWithWebCodecs(
          project,
          video,
          cameraVideo,
          width,
          height,
          trimStartMs,
          trimEndMs,
          speed,
          fps,
          bitrate,
          options
        );
      } catch (err) {
        if (err instanceof Error && err.message === '已取消导出') throw err;
      }
    }

    return await exportWithMediaRecorder(
      project,
      video,
      cameraVideo,
      width,
      height,
      trimStartMs,
      trimEndMs,
      speed,
      fps,
      bitrate,
      options
    );
  } finally {
    URL.revokeObjectURL(videoUrl);
    if (cameraUrl) URL.revokeObjectURL(cameraUrl);
  }
}
