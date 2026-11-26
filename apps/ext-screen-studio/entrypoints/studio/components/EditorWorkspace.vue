<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  Play,
  Pause,
  Download,
  Sparkles,
  Plus,
  Trash2,
  ArrowLeft,
  Sliders,
  Palette,
  Camera,
  Wand2,
  Scissors,
  RotateCcw,
  EyeOff,
  FileImage,
  X
} from 'lucide-vue-next';
import {
  BACKDROP_PRESETS,
  type AspectRatioPreset,
  type BlurRegion,
  type CameraCorner,
  type RecordingProject,
  type WindowFrameStyle,
  type ZoomSegment
} from '../../../src/types/recording';
import { generateAutoZoomSegments } from '../../../src/utils/auto-zoom';
import {
  canvasPointToVideoNorm,
  renderStudioFrame,
  resolveOutputSize
} from '../../../src/utils/canvas-renderer';
import { saveProject } from '../../../src/utils/project-store';
import { loadUserPreferences, saveUserPreferences } from '../../../src/utils/user-prefs';
import { exportStudioVideo } from '../../../src/utils/video-exporter';
import { exportStudioGif } from '../../../src/utils/gif-exporter';

const props = defineProps<{
  project: RecordingProject;
}>();

const emit = defineEmits<{
  back: [];
  updated: [project: RecordingProject];
}>();

const localProject = reactive<RecordingProject>({
  ...props.project,
  trimStartMs: props.project.trimStartMs ?? 0,
  trimEndMs: props.project.trimEndMs ?? props.project.durationMs,
  playbackSpeed: props.project.playbackSpeed ?? 1,
  blurRegions: (props.project.blurRegions ?? []).map((b) => ({ ...b })),
  cutSegments: (props.project.cutSegments ?? []).map((c) => ({ ...c })),
  zoomSegments: props.project.zoomSegments.map((s) => ({ ...s })),
  style: { ...props.project.style }
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasAspect = ref('16 / 9');
const activeTab = ref<'zoom' | 'style' | 'blur' | 'camera'>('zoom');
const isDrawingBlur = ref(false);
const blurDragStart = ref<{ x: number; y: number } | null>(null);
const blurDragCurrent = ref<{ x: number; y: number } | null>(null);
const pendingCutStartMs = ref<number | null>(null);
const isPlaying = ref(false);
const currentMs = ref(localProject.trimStartMs ?? 0);
const durationMs = ref(Math.max(500, props.project.durationMs));
const exportFps = ref<30 | 60>(60);
const exportBitrate = ref<number>(12_000_000);
const selectedSegId = ref<string | null>(
  localProject.zoomSegments[0]?.id ?? null
);
const isExporting = ref(false);
const exportType = ref<'video' | 'gif'>('video');
const exportProgress = ref(0);

let videoEl: HTMLVideoElement | null = null;
let cameraEl: HTMLVideoElement | null = null;
let videoUrl = '';
let cameraUrl = '';
let rafId = 0;
let exportAbort: AbortController | null = null;
let saveTimer = 0;

const selectedSegment = computed(
  () => localProject.zoomSegments.find((s) => s.id === selectedSegId.value) ?? null
);

const schedulePersist = () => {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    const snapshot: RecordingProject = {
      ...localProject,
      blurRegions: (localProject.blurRegions ?? []).map((b) => ({ ...b })),
      cutSegments: (localProject.cutSegments ?? []).map((c) => ({ ...c })),
      zoomSegments: localProject.zoomSegments.map((s) => ({ ...s })),
      style: { ...localProject.style }
    };
    await saveProject(snapshot);
    await saveUserPreferences({
      exportFps: exportFps.value,
      playbackSpeed: localProject.playbackSpeed ?? 1,
      style: snapshot.style
    });
    emit('updated', snapshot);
  }, 350);
};

watch(
  () => [
    localProject.title,
    localProject.trimStartMs,
    localProject.trimEndMs,
    localProject.playbackSpeed,
    exportFps.value,
    localProject.blurRegions,
    localProject.cutSegments,
    localProject.zoomSegments,
    localProject.style
  ],
  () => {
    if (videoEl) videoEl.playbackRate = localProject.playbackSpeed ?? 1;
    if (cameraEl) cameraEl.playbackRate = localProject.playbackSpeed ?? 1;
    schedulePersist();
    if (!isPlaying.value) drawCurrentFrame();
  },
  { deep: true }
);

const drawCurrentFrame = () => {
  const canvas = canvasRef.value;
  if (!canvas || !videoEl) return;
  const { width, height } = resolveOutputSize(
    videoEl.videoWidth || localProject.width,
    videoEl.videoHeight || localProject.height,
    localProject.style.aspectRatio
  );
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  canvasAspect.value = `${width} / ${height}`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  renderStudioFrame({
    ctx,
    canvasWidth: width,
    canvasHeight: height,
    video: videoEl,
    cameraVideo: cameraEl,
    timeMs: currentMs.value,
    style: localProject.style,
    segments: localProject.zoomSegments,
    cursorSamples: localProject.cursorSamples,
    clickEvents: localProject.clickEvents,
    keystrokeEvents: localProject.keystrokeEvents,
    blurRegions: localProject.blurRegions
  });
};

const tick = () => {
  if (!videoEl) return;
  const endLimit = localProject.trimEndMs ?? durationMs.value;
  let nowMs = videoEl.currentTime * 1000;

  // 若播放进入已删除的中间片段，自动跳到该段末尾
  const activeCut = (localProject.cutSegments ?? []).find(
    (c) => nowMs >= c.startMs && nowMs < c.endMs - 30
  );
  if (activeCut) {
    const jumpTarget = Math.min(endLimit, activeCut.endMs);
    videoEl.currentTime = jumpTarget / 1000;
    if (cameraEl) cameraEl.currentTime = jumpTarget / 1000;
    nowMs = jumpTarget;
  }

  currentMs.value = nowMs;
  drawCurrentFrame();
  if (isPlaying.value && !videoEl.ended && currentMs.value < endLimit) {
    rafId = requestAnimationFrame(tick);
  } else {
    isPlaying.value = false;
    videoEl.pause();
    cameraEl?.pause();
  }
};

onMounted(async () => {
  const prefs = await loadUserPreferences();
  exportFps.value = prefs.exportFps;

  videoUrl = URL.createObjectURL(localProject.videoBlob);
  videoEl = document.createElement('video');
  videoEl.src = videoUrl;
  videoEl.playsInline = true;
  videoEl.preload = 'auto';

  await new Promise<void>((resolve) => {
    videoEl!.onloadeddata = () => resolve();
    videoEl!.onerror = () => resolve();
  });

  if (Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
    durationMs.value = videoEl.duration * 1000;
    localProject.durationMs = durationMs.value;
    if (!localProject.trimEndMs || localProject.trimEndMs > durationMs.value) {
      localProject.trimEndMs = durationMs.value;
    }
  }
  videoEl.playbackRate = localProject.playbackSpeed ?? 1;

  if (localProject.cameraBlob) {
    cameraUrl = URL.createObjectURL(localProject.cameraBlob);
    cameraEl = document.createElement('video');
    cameraEl.src = cameraUrl;
    cameraEl.muted = true;
    cameraEl.playsInline = true;
    await new Promise<void>((resolve) => {
      cameraEl!.onloadeddata = () => resolve();
      cameraEl!.onerror = () => resolve();
    });
    cameraEl.playbackRate = localProject.playbackSpeed ?? 1;
  }

  const startSec = (localProject.trimStartMs ?? 0) / 1000;
  videoEl.currentTime = startSec;
  if (cameraEl) cameraEl.currentTime = startSec;
  currentMs.value = localProject.trimStartMs ?? 0;
  drawCurrentFrame();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  clearTimeout(saveTimer);
  exportAbort?.abort();
  videoEl?.pause();
  cameraEl?.pause();
  if (videoUrl) URL.revokeObjectURL(videoUrl);
  if (cameraUrl) URL.revokeObjectURL(cameraUrl);
});

const togglePlay = () => {
  if (!videoEl) return;
  const trimStart = localProject.trimStartMs ?? 0;
  const trimEnd = localProject.trimEndMs ?? durationMs.value;
  if (isPlaying.value) {
    isPlaying.value = false;
    videoEl.pause();
    cameraEl?.pause();
    cancelAnimationFrame(rafId);
  } else {
    if (videoEl.currentTime * 1000 >= trimEnd - 50 || videoEl.currentTime * 1000 < trimStart) {
      videoEl.currentTime = trimStart / 1000;
      if (cameraEl) cameraEl.currentTime = trimStart / 1000;
    }
    videoEl.playbackRate = localProject.playbackSpeed ?? 1;
    if (cameraEl) cameraEl.playbackRate = localProject.playbackSpeed ?? 1;
    isPlaying.value = true;
    void videoEl.play();
    if (cameraEl) void cameraEl.play().catch(() => {});
    rafId = requestAnimationFrame(tick);
  }
};

const setTrimStart = () => {
  const end = localProject.trimEndMs ?? durationMs.value;
  localProject.trimStartMs = Math.min(currentMs.value, Math.max(0, end - 400));
};

const setTrimEnd = () => {
  const start = localProject.trimStartMs ?? 0;
  localProject.trimEndMs = Math.max(currentMs.value, Math.min(durationMs.value, start + 400));
};

const resetTrim = () => {
  localProject.trimStartMs = 0;
  localProject.trimEndMs = durationMs.value;
};

const handleMarkCut = () => {
  if (pendingCutStartMs.value === null) {
    pendingCutStartMs.value = currentMs.value;
    return;
  }
  const startMs = Math.min(pendingCutStartMs.value, currentMs.value);
  const endMs = Math.max(pendingCutStartMs.value, currentMs.value);
  pendingCutStartMs.value = null;
  if (endMs - startMs < 200) return;
  if (!localProject.cutSegments) localProject.cutSegments = [];
  localProject.cutSegments.push({ id: crypto.randomUUID(), startMs, endMs });
};

const removeCutSegment = (id: string) => {
  if (!localProject.cutSegments) return;
  const idx = localProject.cutSegments.findIndex((c) => c.id === id);
  if (idx !== -1) localProject.cutSegments.splice(idx, 1);
};

const seekTo = (ms: number) => {
  const clamped = Math.max(0, Math.min(durationMs.value, ms));
  currentMs.value = clamped;
  if (videoEl) {
    videoEl.currentTime = clamped / 1000;
    videoEl.onseeked = () => drawCurrentFrame();
  }
  if (cameraEl) {
    cameraEl.currentTime = clamped / 1000;
  }
  drawCurrentFrame();
};

const handleTimelineClick = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  seekTo(ratio * durationMs.value);
};

const getNormCanvasPoint = (e: MouseEvent) => {
  const canvas = canvasRef.value!;
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  };
};

const handleCanvasPointerDown = (e: MouseEvent) => {
  if (!canvasRef.value) return;
  if (isDrawingBlur.value) {
    const pt = getNormCanvasPoint(e);
    blurDragStart.value = pt;
    blurDragCurrent.value = pt;
    return;
  }
  if (!selectedSegment.value) return;
  const pt = getNormCanvasPoint(e);
  selectedSegment.value.targetX = Number(pt.x.toFixed(3));
  selectedSegment.value.targetY = Number(pt.y.toFixed(3));
  selectedSegment.value.followCursor = false;
};

const handleCanvasPointerMove = (e: MouseEvent) => {
  if (!isDrawingBlur.value || !blurDragStart.value || !canvasRef.value) return;
  blurDragCurrent.value = getNormCanvasPoint(e);
};

const handleCanvasPointerUp = () => {
  if (!isDrawingBlur.value || !blurDragStart.value || !blurDragCurrent.value || !canvasRef.value) {
    blurDragStart.value = null;
    blurDragCurrent.value = null;
    return;
  }
  const canvas = canvasRef.value;
  const vw = videoEl?.videoWidth || localProject.width;
  const vh = videoEl?.videoHeight || localProject.height;
  const p1 = canvasPointToVideoNorm(
    blurDragStart.value.x,
    blurDragStart.value.y,
    canvas.width,
    canvas.height,
    vw,
    vh,
    currentMs.value,
    localProject.style,
    localProject.zoomSegments,
    localProject.cursorSamples
  );
  const p2 = canvasPointToVideoNorm(
    blurDragCurrent.value.x,
    blurDragCurrent.value.y,
    canvas.width,
    canvas.height,
    vw,
    vh,
    currentMs.value,
    localProject.style,
    localProject.zoomSegments,
    localProject.cursorSamples
  );
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const w = Math.abs(p2.x - p1.x);
  const h = Math.abs(p2.y - p1.y);
  if (w > 0.015 && h > 0.015) {
    if (!localProject.blurRegions) localProject.blurRegions = [];
    localProject.blurRegions.push({
      id: crypto.randomUUID(),
      x,
      y,
      w,
      h,
      strength: 18
    });
  }
  blurDragStart.value = null;
  blurDragCurrent.value = null;
  isDrawingBlur.value = false;
};

const removeBlurRegion = (id: string) => {
  if (!localProject.blurRegions) return;
  const idx = localProject.blurRegions.findIndex((b) => b.id === id);
  if (idx !== -1) localProject.blurRegions.splice(idx, 1);
};

const addZoomAtCurrent = () => {
  const start = Math.max(0, currentMs.value - 200);
  const end = Math.min(durationMs.value, start + 1800);
  const newSeg: ZoomSegment = {
    id: crypto.randomUUID(),
    startMs: start,
    endMs: Math.max(start + 600, end),
    scale: 1.8,
    targetX: 0.5,
    targetY: 0.5,
    followCursor: true
  };
  localProject.zoomSegments.push(newSeg);
  localProject.zoomSegments.sort((a, b) => a.startMs - b.startMs);
  selectedSegId.value = newSeg.id;
};

const removeSegment = (id: string) => {
  const idx = localProject.zoomSegments.findIndex((s) => s.id === id);
  if (idx !== -1) {
    localProject.zoomSegments.splice(idx, 1);
    if (selectedSegId.value === id) {
      selectedSegId.value = localProject.zoomSegments[0]?.id ?? null;
    }
  }
};

const resetAutoZoom = () => {
  localProject.zoomSegments = generateAutoZoomSegments(
    localProject.clickEvents,
    durationMs.value
  );
  selectedSegId.value = localProject.zoomSegments[0]?.id ?? null;
};

const handleExport = async () => {
  if (isExporting.value) return;
  if (isPlaying.value) togglePlay();

  isExporting.value = true;
  exportType.value = 'video';
  exportProgress.value = 0;
  exportAbort = new AbortController();

  try {
    const { blob, ext } = await exportStudioVideo(localProject, {
      fps: exportFps.value,
      bitrate: exportBitrate.value,
      speed: localProject.playbackSpeed ?? 1,
      onProgress: (pct) => {
        exportProgress.value = pct;
      },
      signal: exportAbort.signal
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${localProject.title.replace(/[\\/:*?"<>|]/g, '_')}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    if (err instanceof Error && err.message !== '已取消导出') {
      alert(err.message);
    }
  } finally {
    isExporting.value = false;
    exportAbort = null;
  }
};

const handleExportGif = async () => {
  if (isExporting.value) return;
  if (isPlaying.value) togglePlay();

  isExporting.value = true;
  exportType.value = 'gif';
  exportProgress.value = 0;
  exportAbort = new AbortController();

  try {
    const blob = await exportStudioGif(localProject, {
      fps: 12,
      maxWidth: 960,
      speed: localProject.playbackSpeed ?? 1,
      onProgress: (pct) => {
        exportProgress.value = pct;
      },
      signal: exportAbort.signal
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${localProject.title.replace(/[\\/:*?"<>|]/g, '_')}.gif`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    if (err instanceof Error && err.message !== '已取消导出') {
      alert(err.message);
    }
  } finally {
    isExporting.value = false;
    exportAbort = null;
  }
};

const formatTime = (ms: number) => {
  const s = Math.max(0, ms / 1000);
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, '0');
  return `${m}:${sec}`;
};

const ratios: Array<{ label: string; value: AspectRatioPreset }> = [
  { label: '16:9 横屏', value: '16:9' },
  { label: '9:16 竖屏', value: '9:16' },
  { label: '1:1 方形', value: '1:1' },
  { label: '4:3 经典', value: '4:3' },
  { label: '原始比例', value: 'auto' }
];

const corners: Array<{ label: string; value: CameraCorner }> = [
  { label: '右下', value: 'bottom-right' },
  { label: '左下', value: 'bottom-left' },
  { label: '右上', value: 'top-right' },
  { label: '左上', value: 'top-left' }
];

const frameModes: Array<{ label: string; value: WindowFrameStyle }> = [
  { label: '无边框', value: 'none' },
  { label: 'macOS 深色', value: 'macos-dark' },
  { label: 'macOS 浅色', value: 'macos-light' }
];
</script>

<template>
  <div class="editor-shell">
    <header class="topbar">
      <div class="topbar-left">
        <button class="icon-btn" @click="emit('back')">
          <ArrowLeft :size="16" />
          <span>工程库</span>
        </button>
        <input v-model="localProject.title" class="title-input" />
      </div>

      <div class="topbar-right">
        <select v-model.number="localProject.playbackSpeed" class="top-select" title="视频播放与导出倍速">
          <option :value="1">1.0x 原速</option>
          <option :value="1.25">1.25x 轻快</option>
          <option :value="1.5">1.5x 演示</option>
          <option :value="2">2.0x 极速</option>
        </select>
        <select v-model.number="exportFps" class="top-select" title="导出帧率">
          <option :value="30">30 FPS</option>
          <option :value="60">60 FPS</option>
        </select>
        <button class="secondary-btn" @click="resetAutoZoom">
          <Wand2 :size="15" />
          <span>智能重算跟焦</span>
        </button>
        <button class="secondary-btn" :disabled="isExporting" @click="handleExportGif">
          <FileImage :size="15" />
          <span>导出 GIF</span>
        </button>
        <button class="export-btn" :disabled="isExporting" @click="handleExport">
          <Download :size="16" />
          <span>导出 MP4</span>
        </button>
      </div>
    </header>

    <div class="workspace-body">
      <main class="stage-column">
        <div class="canvas-stage">
          <div class="canvas-box" :style="{ aspectRatio: canvasAspect }">
            <canvas
              ref="canvasRef"
              class="preview-canvas"
              :class="{ 'blur-cursor': isDrawingBlur }"
              :title="isDrawingBlur ? '拖拽框选需要模糊打码的隐私区域' : '点击画面可手动定位当前缩放焦点'"
              @mousedown="handleCanvasPointerDown"
              @mousemove="handleCanvasPointerMove"
              @mouseup="handleCanvasPointerUp"
            />
            <div
              v-if="isDrawingBlur && blurDragStart && blurDragCurrent"
              class="blur-selection-rect"
              :style="{
                left: `${Math.min(blurDragStart.x, blurDragCurrent.x) * 100}%`,
                top: `${Math.min(blurDragStart.y, blurDragCurrent.y) * 100}%`,
                width: `${Math.abs(blurDragCurrent.x - blurDragStart.x) * 100}%`,
                height: `${Math.abs(blurDragCurrent.y - blurDragStart.y) * 100}%`
              }"
            />
          </div>
        </div>

        <section class="timeline-dock">
          <div class="timeline-controls">
            <button class="play-btn" @click="togglePlay">
              <component :is="isPlaying ? Pause : Play" :size="16" />
            </button>
            <span class="timecode">
              {{ formatTime(currentMs) }} / {{ formatTime(durationMs) }}
            </span>
            <button class="add-zoom-btn" @click="addZoomAtCurrent">
              <Plus :size="14" />
              <span>在此处添加跟焦放大</span>
            </button>
            <button class="trim-btn" title="将当前播放头设为裁剪起点" @click="setTrimStart">
              <Scissors :size="13" />
              <span>设为入点</span>
            </button>
            <button class="trim-btn" title="将当前播放头设为裁剪终点" @click="setTrimEnd">
              <Scissors :size="13" />
              <span>设为出点</span>
            </button>
            <button
              v-if="(localProject.trimStartMs ?? 0) > 0 || (localProject.trimEndMs ?? durationMs) < durationMs"
              class="trim-btn"
              title="恢复完整时长"
              @click="resetTrim"
            >
              <RotateCcw :size="13" />
              <span>重置裁剪</span>
            </button>
            <button
              class="trim-btn"
              :class="{ active: pendingCutStartMs !== null }"
              title="先点一次定起点，移到终点再点一次即可删掉中间废片段"
              @click="handleMarkCut"
            >
              <Scissors :size="13" />
              <span>{{ pendingCutStartMs === null ? '删中间段' : '点此确认删除' }}</span>
            </button>
            <span class="hint">点击蓝色片段调倍率 / 点击红色片段撤销删除</span>
          </div>

          <div class="timeline-track" @click="handleTimelineClick">
            <div
              v-if="(localProject.trimStartMs ?? 0) > 0"
              class="trim-mask left"
              :style="{ width: `${((localProject.trimStartMs ?? 0) / Math.max(1, durationMs)) * 100}%` }"
            />
            <div
              v-if="(localProject.trimEndMs ?? durationMs) < durationMs"
              class="trim-mask right"
              :style="{ width: `${((durationMs - (localProject.trimEndMs ?? durationMs)) / Math.max(1, durationMs)) * 100}%` }"
            />
            <div
              v-for="cut in localProject.cutSegments ?? []"
              :key="cut.id"
              class="cut-segment"
              title="已删除片段（点击恢复）"
              :style="{
                left: `${(cut.startMs / Math.max(1, durationMs)) * 100}%`,
                width: `${Math.max(1, ((cut.endMs - cut.startMs) / Math.max(1, durationMs)) * 100)}%`
              }"
              @click.stop="removeCutSegment(cut.id)"
            />
            <div
              class="playhead"
              :style="{ left: `${(currentMs / Math.max(1, durationMs)) * 100}%` }"
            />

            <div
              v-for="(click, i) in localProject.clickEvents"
              :key="i"
              class="click-dot"
              :style="{ left: `${(click.t / Math.max(1, durationMs)) * 100}%` }"
              title="鼠标点击事件"
            />

            <div
              v-for="seg in localProject.zoomSegments"
              :key="seg.id"
              class="zoom-pill"
              :class="{ selected: seg.id === selectedSegId }"
              :style="{
                left: `${(seg.startMs / Math.max(1, durationMs)) * 100}%`,
                width: `${Math.max(1.5, ((seg.endMs - seg.startMs) / Math.max(1, durationMs)) * 100)}%`
              }"
              @click.stop="
                selectedSegId = seg.id;
                seekTo(seg.startMs + 250);
              "
            >
              <span>{{ seg.scale.toFixed(1) }}x</span>
            </div>
          </div>
        </section>
      </main>

      <aside class="inspector">
        <div class="tabs">
          <button
            :class="{ active: activeTab === 'zoom' }"
            @click="activeTab = 'zoom'"
          >
            <Sliders :size="14" />
            <span>跟焦</span>
          </button>
          <button
            :class="{ active: activeTab === 'style' }"
            @click="activeTab = 'style'"
          >
            <Palette :size="14" />
            <span>画布</span>
          </button>
          <button
            :class="{ active: activeTab === 'blur' }"
            @click="activeTab = 'blur'"
          >
            <EyeOff :size="14" />
            <span>打码</span>
          </button>
          <button
            :class="{ active: activeTab === 'camera' }"
            @click="activeTab = 'camera'"
          >
            <Camera :size="14" />
            <span>人像</span>
          </button>
        </div>

        <div v-if="activeTab === 'zoom'" class="panel-content">
          <div v-if="selectedSegment" class="card">
            <div class="card-head">
              <span>当前放大片段</span>
              <button
                class="danger-icon"
                title="删除此放大片段"
                @click="removeSegment(selectedSegment.id)"
              >
                <Trash2 :size="14" />
              </button>
            </div>

            <label class="field">
              <span>缩放倍率：{{ selectedSegment.scale.toFixed(2) }}x</span>
              <input
                v-model.number="selectedSegment.scale"
                type="range"
                min="1.2"
                max="3.0"
                step="0.05"
              />
            </label>

            <label class="field">
              <span>开始时间 (秒)：{{ (selectedSegment.startMs / 1000).toFixed(1) }}s</span>
              <input
                v-model.number="selectedSegment.startMs"
                type="range"
                :min="0"
                :max="Math.max(0, selectedSegment.endMs - 400)"
                step="50"
              />
            </label>

            <label class="field">
              <span>结束时间 (秒)：{{ (selectedSegment.endMs / 1000).toFixed(1) }}s</span>
              <input
                v-model.number="selectedSegment.endMs"
                type="range"
                :min="selectedSegment.startMs + 400"
                :max="durationMs"
                step="50"
              />
            </label>

            <label class="switch-row">
              <span>平滑跟随鼠标移动</span>
              <input v-model="selectedSegment.followCursor" type="checkbox" />
            </label>
          </div>

          <div v-else class="empty-card">
            点击时间轴上的紫色片段进行编辑，或点击「添加跟焦放大」。
          </div>

          <div class="card">
            <div class="card-head">
              <span>全局光标与动画</span>
            </div>

            <label class="field">
              <span>缩放过渡平滑度：{{ localProject.style.transitionMs }} ms</span>
              <input
                v-model.number="localProject.style.transitionMs"
                type="range"
                min="150"
                max="900"
                step="30"
              />
            </label>

            <label class="switch-row">
              <span>渲染高清矢量指针</span>
              <input v-model="localProject.style.showCursor" type="checkbox" />
            </label>

            <label v-if="localProject.style.showCursor" class="field">
              <span>指针大小：{{ localProject.style.cursorSize.toFixed(2) }}x</span>
              <input
                v-model.number="localProject.style.cursorSize"
                type="range"
                min="0.8"
                max="2.2"
                step="0.05"
              />
            </label>

            <label class="switch-row">
              <span>鼠标点击波纹动效</span>
              <input v-model="localProject.style.showClickRipple" type="checkbox" />
            </label>

            <label v-if="localProject.style.showClickRipple" class="switch-row">
              <span>波纹颜色</span>
              <input v-model="localProject.style.rippleColor" type="color" />
            </label>

            <label class="switch-row">
              <span>显示键盘快捷键提示</span>
              <input v-model="localProject.style.showKeystrokes" type="checkbox" />
            </label>
          </div>
        </div>

        <div v-else-if="activeTab === 'style'" class="panel-content">
          <div class="card">
            <div class="card-head"><span>输出画布比例</span></div>
            <div class="chip-grid">
              <button
                v-for="r in ratios"
                :key="r.value"
                class="chip"
                :class="{ active: localProject.style.aspectRatio === r.value }"
                @click="localProject.style.aspectRatio = r.value"
              >
                {{ r.label }}
              </button>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><span>电影级背景壁纸</span></div>
            <div class="backdrop-grid">
              <button
                v-for="bg in BACKDROP_PRESETS"
                :key="bg.id"
                class="bg-swatch"
                :class="{ active: localProject.style.backdropId === bg.id }"
                :style="{
                  background: `linear-gradient(${bg.angle}deg, ${bg.stops.join(', ')})`
                }"
                :title="bg.name"
                @click="localProject.style.backdropId = bg.id"
              />
            </div>

            <div v-if="localProject.style.backdropId === 'custom'" class="custom-colors">
              <label class="switch-row">
                <span>起始色</span>
                <input v-model="localProject.style.customGradientStart" type="color" />
              </label>
              <label class="switch-row">
                <span>结束色</span>
                <input v-model="localProject.style.customGradientEnd" type="color" />
              </label>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><span>窗口质感</span></div>
            <label class="field">
              <span>画布边距：{{ localProject.style.padding }} px</span>
              <input
                v-model.number="localProject.style.padding"
                type="range"
                min="0"
                max="140"
                step="4"
              />
            </label>
            <label class="field">
              <span>窗口圆角：{{ localProject.style.borderRadius }} px</span>
              <input
                v-model.number="localProject.style.borderRadius"
                type="range"
                min="0"
                max="40"
                step="2"
              />
            </label>
            <label class="field">
              <span>投影深度：{{ Math.round(localProject.style.shadowIntensity * 100) }}%</span>
              <input
                v-model.number="localProject.style.shadowIntensity"
                type="range"
                min="0"
                max="0.85"
                step="0.05"
              />
            </label>
          </div>

          <div class="card">
            <div class="card-head"><span>拟物窗口外框与署名</span></div>
            <div class="chip-grid">
              <button
                v-for="fm in frameModes"
                :key="fm.value"
                class="chip"
                :class="{ active: (localProject.style.windowFrame ?? 'none') === fm.value }"
                @click="localProject.style.windowFrame = fm.value"
              >
                {{ fm.label }}
              </button>
            </div>
            <label class="field">
              <span>防盗署名角标（如 @你的ID）</span>
              <input
                v-model="localProject.style.watermarkText"
                class="text-input"
                placeholder="留空则不显示水印"
                maxlength="32"
              />
            </label>
          </div>
        </div>

        <div v-else-if="activeTab === 'blur'" class="panel-content">
          <div class="card">
            <div class="card-head">
              <span>局部隐私模糊打码</span>
              <button
                class="chip"
                :class="{ active: isDrawingBlur }"
                @click="isDrawingBlur = !isDrawingBlur"
              >
                {{ isDrawingBlur ? '正在框选...' : '+ 框选区域' }}
              </button>
            </div>
            <p class="muted-tip">
              点击「+ 框选区域」后，直接在左侧画面拖拽框选敏感信息（如手机号、Token、余额），放大跟焦时打码会自动跟随移动。
            </p>
          </div>

          <div
            v-for="(region, idx) in localProject.blurRegions ?? []"
            :key="region.id"
            class="card"
          >
            <div class="card-head">
              <span>打码区域 #{{ idx + 1 }}</span>
              <button class="danger-icon" @click="removeBlurRegion(region.id)">
                <Trash2 :size="14" />
              </button>
            </div>
            <label class="field">
              <span>模糊强度：{{ region.strength }} px</span>
              <input v-model.number="region.strength" type="range" min="6" max="36" step="2" />
            </label>
          </div>
        </div>

        <div v-else class="panel-content">
          <div class="card">
            <div class="card-head"><span>摄像头画中画设置</span></div>
            <p v-if="!localProject.cameraBlob" class="muted-tip">
              本次录制未开启摄像头。如需人像画中画，请在下次录制前开启「摄像头画中画」。
            </p>
            <template v-else>
              <label class="switch-row">
                <span>显示摄像头画中画</span>
                <input v-model="localProject.style.showCamera" type="checkbox" />
              </label>

              <div class="field">
                <span>停靠角落</span>
                <div class="chip-grid">
                  <button
                    v-for="c in corners"
                    :key="c.value"
                    class="chip"
                    :class="{ active: localProject.style.cameraCorner === c.value }"
                    @click="localProject.style.cameraCorner = c.value"
                  >
                    {{ c.label }}
                  </button>
                </div>
              </div>

              <label class="field">
                <span>画中画大小：{{ localProject.style.cameraSize }}%</span>
                <input
                  v-model.number="localProject.style.cameraSize"
                  type="range"
                  min="10"
                  max="32"
                  step="1"
                />
              </label>

              <label class="field">
                <span>圆角程度：{{ localProject.style.cameraRoundness }}%</span>
                <input
                  v-model.number="localProject.style.cameraRoundness"
                  type="range"
                  min="6"
                  max="50"
                  step="2"
                />
              </label>
            </template>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="isExporting" class="export-modal">
      <div class="export-box">
        <Sparkles :size="24" class="spin-icon" />
        <h3>{{ exportType === 'gif' ? '正在纯本地编码导出 GIF 动图' : '正在纯本地极速合成 MP4 视频' }}</h3>
        <p>渲染进度 {{ exportProgress }}%（支持后台运行不掉帧）</p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${exportProgress}%` }" />
        </div>
        <button class="cancel-btn" @click="exportAbort?.abort()">
          <X :size="15" />
          <span>取消导出</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #09090b;
  color: #f4f4f5;
  overflow: hidden;
}

.topbar {
  height: 56px;
  padding: 0 20px;
  border-bottom: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #111114;
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn,
.secondary-btn,
.top-select {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid #3f3f46;
  background: #18181b;
  color: #e4e4e7;
  font-size: 13px;
  cursor: pointer;
}

.title-input {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 600;
  padding: 5px 8px;
  width: 240px;
}

.title-input:focus {
  outline: none;
  border-color: #6366f1;
  background: #18181b;
}

.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #f4f4f5;
  color: #141416;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.export-btn:hover {
  background: #ffffff;
}

.workspace-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 320px;
  min-height: 0;
}

.stage-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.canvas-stage {
  flex: 1;
  min-height: 0;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0c0c0f;
}

.canvas-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
}

.preview-canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
  cursor: crosshair;
  display: block;
}

.preview-canvas.blur-cursor {
  cursor: cell;
}

.blur-selection-rect {
  position: absolute;
  border: 2px dashed #f59e0b;
  background: rgba(245, 158, 11, 0.18);
  pointer-events: none;
  border-radius: 4px;
}

.timeline-dock {
  height: 132px;
  border-top: 1px solid #27272a;
  background: #111114;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.play-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: #f4f4f5;
  color: #141416;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.timecode {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  color: #d4d4d8;
}

.add-zoom-btn,
.trim-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  border-radius: 8px;
  border: 1px solid #3f3f46;
  background: #202024;
  color: #e4e4e7;
  font-size: 12px;
  cursor: pointer;
}

.trim-btn:hover,
.add-zoom-btn:hover {
  background: #27272c;
}

.trim-btn.active {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.cut-segment {
  position: absolute;
  top: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    rgba(239, 68, 68, 0.35),
    rgba(239, 68, 68, 0.35) 6px,
    rgba(127, 29, 29, 0.45) 6px,
    rgba(127, 29, 29, 0.45) 12px
  );
  border-left: 1px solid #ef4444;
  border-right: 1px solid #ef4444;
  z-index: 2;
  cursor: pointer;
}

.text-input {
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid #3f3f46;
  background: #27272a;
  color: #f4f4f5;
  font-size: 12px;
}

.trim-mask {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(9, 9, 11, 0.72);
  z-index: 2;
  pointer-events: none;
}

.trim-mask.left {
  left: 0;
  border-right: 2px solid #f59e0b;
}

.trim-mask.right {
  right: 0;
  border-left: 2px solid #f59e0b;
}

.hint {
  margin-left: auto;
  font-size: 12px;
  color: #71717a;
}

.timeline-track {
  position: relative;
  height: 52px;
  border-radius: 10px;
  background: #18181b;
  border: 1px solid #27272a;
  cursor: pointer;
  overflow: hidden;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #f43f5e;
  z-index: 3;
  pointer-events: none;
}

.click-dot {
  position: absolute;
  top: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fb7185;
  transform: translateX(-50%);
  z-index: 1;
  pointer-events: none;
}

.zoom-pill {
  position: absolute;
  top: 18px;
  height: 26px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.45);
  border: 1px solid #60a5fa;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  overflow: hidden;
}

.zoom-pill.selected {
  background: #2563eb;
  border-color: #ffffff;
}

.inspector {
  border-left: 1px solid #27272a;
  background: #111114;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid #27272a;
}

.tabs button {
  padding: 12px 6px;
  border: none;
  background: transparent;
  color: #a1a1aa;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tabs button.active {
  color: #ffffff;
  border-bottom-color: #f4f4f5;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card,
.empty-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-card,
.muted-tip {
  font-size: 12px;
  color: #a1a1aa;
  line-height: 1.6;
  margin: 0;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #e4e4e7;
}

.danger-icon {
  border: none;
  background: rgba(239, 68, 68, 0.14);
  color: #f87171;
  border-radius: 6px;
  padding: 4px 6px;
  cursor: pointer;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #a1a1aa;
}

.field input[type='range'] {
  width: 100%;
  accent-color: #3b82f6;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #d4d4d8;
}

.chip-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.chip {
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid #3f3f46;
  background: #27272a;
  color: #d4d4d8;
  font-size: 12px;
  cursor: pointer;
}

.chip.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.18);
  color: #ffffff;
}

.backdrop-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.bg-swatch {
  height: 36px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
}

.bg-swatch.active {
  border-color: #ffffff;
}

.export-modal {
  position: fixed;
  inset: 0;
  background: rgba(9, 9, 11, 0.8);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.export-box {
  width: 380px;
  background: #18181b;
  border: 1px solid #3f3f46;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
}

.export-box h3 {
  margin: 12px 0 6px;
  font-size: 16px;
}

.export-box p {
  margin: 0 0 16px;
  font-size: 12px;
  color: #a1a1aa;
}

.spin-icon {
  color: #818cf8;
}

.progress-bar {
  height: 8px;
  border-radius: 999px;
  background: #27272a;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: #ef4444;
  transition: width 0.15s;
}

.cancel-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid #3f3f46;
  background: #27272a;
  color: #e4e4e7;
  font-size: 12px;
  cursor: pointer;
}
</style>
