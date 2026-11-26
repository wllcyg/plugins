<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Square,
  MousePointerClick,
  Disc,
  Pause,
  Play,
  ArrowLeft
} from 'lucide-vue-next';
import {
  DEFAULT_STYLE_CONFIG,
  type ClickEvent,
  type CursorSample,
  type KeystrokeEvent,
  type RecordingProject
} from '../../../src/types/recording';
import { generateAutoZoomSegments } from '../../../src/utils/auto-zoom';
import { saveProject } from '../../../src/utils/project-store';
import { loadUserPreferences, saveUserPreferences } from '../../../src/utils/user-prefs';

const props = defineProps<{
  initialAudio: boolean;
  initialCamera: boolean;
}>();

const emit = defineEmits<{
  back: [];
  recorded: [projectId: string];
}>();

const withAudio = ref(props.initialAudio);
const withCamera = ref(props.initialCamera);
const withCountdown = ref(true);
const prefsLoaded = ref(false);
const countdownNum = ref(0);
const isRecording = ref(false);
const isPaused = ref(false);
const isSaving = ref(false);
const elapsedMs = ref(0);
const clickCount = ref(0);
const errorMessage = ref('');
const cameraPreviewRef = ref<HTMLVideoElement | null>(null);

let screenStream: MediaStream | null = null;
let micStream: MediaStream | null = null;
let cameraStream: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let screenRecorder: MediaRecorder | null = null;
let cameraRecorder: MediaRecorder | null = null;
let screenChunks: BlobPart[] = [];
let cameraChunks: BlobPart[] = [];
let cursorSamples: CursorSample[] = [];
let clickEvents: ClickEvent[] = [];
let keystrokeEvents: KeystrokeEvent[] = [];
let recordingStartTs = 0;
let pausedAtTs = 0;
let pausedAccumMs = 0;
let timerId = 0;

const handleRuntimeMessage = (message: {
  type?: string;
  payload?: { ts: number; x?: number; y?: number; button?: number; label?: string };
}) => {
  if (message?.type === 'COMMAND_STOP_RECORDING' || message?.type === 'CONTROL_STOP_RECORDING') {
    if (isRecording.value) void stopCapture();
    return;
  }
  if (message?.type === 'CONTROL_TOGGLE_PAUSE') {
    if (isRecording.value) togglePause();
    return;
  }
  if (!isRecording.value || isPaused.value || !message?.payload) return;
  const relT = Math.max(0, message.payload.ts - recordingStartTs - pausedAccumMs);
  if (message.type === 'RECORDING_CURSOR_MOVE' && typeof message.payload.x === 'number' && typeof message.payload.y === 'number') {
    cursorSamples.push({ t: relT, x: message.payload.x, y: message.payload.y });
  } else if (message.type === 'RECORDING_CLICK' && typeof message.payload.x === 'number' && typeof message.payload.y === 'number') {
    clickEvents.push({
      t: relT,
      x: message.payload.x,
      y: message.payload.y,
      button: message.payload.button ?? 0
    });
    clickCount.value = clickEvents.length;
  } else if (message.type === 'RECORDING_BOOKMARK') {
    const lastCursor = cursorSamples[cursorSamples.length - 1];
    clickEvents.push({
      t: relT,
      x: lastCursor?.x ?? 0.5,
      y: lastCursor?.y ?? 0.5,
      button: 0
    });
    clickCount.value = clickEvents.length;
  } else if (message.type === 'RECORDING_KEYSTROKE' && message.payload.label) {
    keystrokeEvents.push({ t: relT, label: message.payload.label });
  }
};

onMounted(async () => {
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  const prefs = await loadUserPreferences();
  withAudio.value = prefs.enableAudio;
  withCamera.value = prefs.enableCamera;
  withCountdown.value = prefs.enableCountdown;
  prefsLoaded.value = true;
});

watch([withAudio, withCamera, withCountdown], ([audio, camera, countdown]) => {
  if (!prefsLoaded.value) return;
  void saveUserPreferences({
    enableAudio: audio,
    enableCamera: camera,
    enableCountdown: countdown
  });
});

onBeforeUnmount(() => {
  chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
  cleanupStreams();
});

const cleanupStreams = () => {
  clearInterval(timerId);
  screenStream?.getTracks().forEach((t) => t.stop());
  micStream?.getTracks().forEach((t) => t.stop());
  cameraStream?.getTracks().forEach((t) => t.stop());
  if (audioCtx) void audioCtx.close().catch(() => {});
  screenStream = null;
  micStream = null;
  cameraStream = null;
  audioCtx = null;
};

const formatTimer = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const startCapture = async () => {
  errorMessage.value = '';
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 60, max: 60 },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        cursor: 'never'
      } as MediaTrackConstraints,
      audio: true
    });

    const tracks: MediaStreamTrack[] = [...screenStream.getVideoTracks()];

    // 混合系统音与降噪压限处理后的麦克风音频
    if (withAudio.value) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true
          }
        });
      } catch {
        micStream = null;
      }
    }

    const sysAudio = screenStream.getAudioTracks();
    const micAudio = micStream?.getAudioTracks() ?? [];
    if (sysAudio.length > 0 || micAudio.length > 0) {
      audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      if (sysAudio.length > 0) {
        audioCtx.createMediaStreamSource(new MediaStream(sysAudio)).connect(dest);
      }
      if (micAudio.length > 0) {
        const micSrc = audioCtx.createMediaStreamSource(new MediaStream(micAudio));
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 18;
        compressor.ratio.value = 4;
        micSrc.connect(compressor);
        compressor.connect(dest);
      }
      const mixed = dest.stream.getAudioTracks()[0];
      if (mixed) tracks.push(mixed);
    }

    // 独立录制摄像头流，便于后期自由调整画中画四角位置和圆角
    if (withCamera.value) {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        if (cameraPreviewRef.value) {
          cameraPreviewRef.value.srcObject = cameraStream;
        }
      } catch {
        cameraStream = null;
      }
    }

    const combined = new MediaStream(tracks);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    screenChunks = [];
    cameraChunks = [];
    cursorSamples = [];
    clickEvents = [];
    keystrokeEvents = [];
    clickCount.value = 0;
    pausedAtTs = 0;
    pausedAccumMs = 0;
    isPaused.value = false;

    screenRecorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: 6_000_000
    });
    screenRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) screenChunks.push(e.data);
    };

    if (cameraStream) {
      cameraRecorder = new MediaRecorder(cameraStream, { mimeType: 'video/webm' });
      cameraRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) cameraChunks.push(e.data);
      };
    }

    // 用户通过浏览器原生条点「停止共享」时同步收尾
    screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
      countdownNum.value = 0;
      if (isRecording.value) void stopCapture();
    });

    // 3-2-1 开场倒计时，给用户留出切回目标窗口的时间
    if (withCountdown.value) {
      for (let c = 3; c >= 1; c--) {
        if (!screenStream) return;
        countdownNum.value = c;
        await new Promise((r) => setTimeout(r, 900));
      }
      countdownNum.value = 0;
    }

    recordingStartTs = Date.now();
    elapsedMs.value = 0;
    isRecording.value = true;

    void chrome.runtime.sendMessage({ type: 'SET_RECORDING_ACTIVE', isRecording: true, isPaused: false });

    screenRecorder.start(250);
    cameraRecorder?.start(250);
    timerId = window.setInterval(() => {
      if (!isPaused.value) {
        elapsedMs.value = Date.now() - recordingStartTs - pausedAccumMs;
      }
    }, 200);
  } catch (err) {
    cleanupStreams();
    errorMessage.value =
      err instanceof Error ? err.message : '未获取到屏幕共享权限，请重试';
  }
};

const togglePause = () => {
  if (!isRecording.value || isSaving.value) return;
  if (isPaused.value) {
    pausedAccumMs += Date.now() - pausedAtTs;
    isPaused.value = false;
    if (screenRecorder?.state === 'paused') screenRecorder.resume();
    if (cameraRecorder?.state === 'paused') cameraRecorder.resume();
    void chrome.runtime.sendMessage({ type: 'SET_RECORDING_ACTIVE', isRecording: true, isPaused: false });
  } else {
    pausedAtTs = Date.now();
    isPaused.value = true;
    if (screenRecorder?.state === 'recording') screenRecorder.pause();
    if (cameraRecorder?.state === 'recording') cameraRecorder.pause();
    void chrome.runtime.sendMessage({ type: 'SET_RECORDING_ACTIVE', isRecording: true, isPaused: true });
  }
};

const stopCapture = async () => {
  if (!isRecording.value || isSaving.value) return;
  if (isPaused.value) {
    pausedAccumMs += Date.now() - pausedAtTs;
    isPaused.value = false;
  }
  isRecording.value = false;
  isSaving.value = true;
  clearInterval(timerId);
  void chrome.runtime.sendMessage({ type: 'SET_RECORDING_ACTIVE', isRecording: false });

  const durationMs = Math.max(500, Date.now() - recordingStartTs - pausedAccumMs);

  const waitStop = (rec: MediaRecorder | null) =>
    new Promise<void>((resolve) => {
      if (!rec || rec.state === 'inactive') return resolve();
      rec.onstop = () => resolve();
      rec.stop();
    });

  await Promise.all([waitStop(screenRecorder), waitStop(cameraRecorder)]);

  const videoTrack = screenStream?.getVideoTracks()[0];
  const settings = videoTrack?.getSettings();
  const width = settings?.width ?? 1920;
  const height = settings?.height ?? 1080;

  const videoBlob = new Blob(screenChunks, { type: 'video/webm' });
  const cameraBlob = cameraChunks.length
    ? new Blob(cameraChunks, { type: 'video/webm' })
    : undefined;

  cleanupStreams();

  const prefs = await loadUserPreferences();
  const id = crypto.randomUUID();
  const zoomSegments = generateAutoZoomSegments(clickEvents, durationMs);
  const nowStr = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const project: RecordingProject = {
    id,
    title: `跟焦录屏 ${nowStr}`,
    createdAt: Date.now(),
    durationMs,
    trimStartMs: 0,
    trimEndMs: durationMs,
    playbackSpeed: prefs.playbackSpeed,
    width,
    height,
    videoBlob,
    cameraBlob,
    cursorSamples,
    clickEvents,
    keystrokeEvents,
    zoomSegments,
    style: { ...prefs.style, showCamera: Boolean(cameraBlob) }
  };

  await saveProject(project);
  isSaving.value = false;
  emit('recorded', id);
};
</script>

<template>
  <div class="recorder-wrap">
    <div class="recorder-card">
      <div class="top-row">
        <button class="back-btn" :disabled="isRecording" @click="emit('back')">
          <ArrowLeft :size="16" />
          <span>工程库</span>
        </button>
        <span class="badge">纯本地无限时长 · 自动采集鼠标跟焦</span>
      </div>

      <div class="hero">
        <div class="hero-icon" :class="{ pulsing: isRecording }">
          <Video :size="28" />
        </div>
        <h2>{{ isRecording ? (isPaused ? '录制已暂停' : '正在录制中...') : '准备电影级跟焦录屏' }}</h2>
        <p v-if="!isRecording">
          点击开始后，选择要录制的「标签页 / 窗口 / 整个屏幕」。<br />
          切换到目标网页操作，系统会自动记录您的鼠标轨迹与点击焦点。
        </p>
        <p v-else class="recording-stats">
          <span class="timer">{{ formatTimer(elapsedMs) }}</span>
          <span class="divider">·</span>
          <span class="clicks">
            <MousePointerClick :size="15" />
            已捕获 {{ clickCount }} 次点击焦点
          </span>
        </p>
      </div>

      <div v-if="countdownNum > 0" class="countdown-box">
        <span class="countdown-num">{{ countdownNum }}</span>
        <p>请切回要录制的网页窗口，即将开始录制...</p>
      </div>

      <div v-else-if="!isRecording" class="options-grid">
        <button
          class="opt-btn"
          :class="{ active: withAudio }"
          @click="withAudio = !withAudio"
        >
          <component :is="withAudio ? Mic : MicOff" :size="18" />
          <span>麦克风降噪：{{ withAudio ? '开启' : '关闭' }}</span>
        </button>

        <button
          class="opt-btn"
          :class="{ active: withCamera }"
          @click="withCamera = !withCamera"
        >
          <component :is="withCamera ? Camera : CameraOff" :size="18" />
          <span>摄像头画中画：{{ withCamera ? '开启' : '关闭' }}</span>
        </button>

        <label class="countdown-toggle">
          <input v-model="withCountdown" type="checkbox" />
          <span>开启 3 秒开场倒计时（留出切窗时间）</span>
        </label>
      </div>

      <video
        v-show="isRecording && withCamera"
        ref="cameraPreviewRef"
        class="cam-preview"
        autoplay
        muted
        playsinline
      />

      <p v-if="errorMessage" class="error-tip">{{ errorMessage }}</p>

      <div class="actions">
        <button
          v-if="!isRecording"
          class="start-btn"
          :disabled="isSaving"
          @click="startCapture"
        >
          <Disc :size="17" />
          <span>选择屏幕并开始录制</span>
        </button>

        <div v-else class="recording-actions">
          <button class="pause-btn" :disabled="isSaving" @click="togglePause">
            <component :is="isPaused ? Play : Pause" :size="16" />
            <span>{{ isPaused ? '继续录制' : '暂停' }}</span>
          </button>
          <button class="stop-btn" :disabled="isSaving" @click="stopCapture">
            <Square :size="16" />
            <span>{{ isSaving ? '正在生成跟焦工程...' : '停止并进入剪辑台' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recorder-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #111113;
}

.recorder-card {
  width: 100%;
  max-width: 540px;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #2e2e34;
  background: #202024;
  color: #e4e4e7;
  font-size: 13px;
  cursor: pointer;
}

.back-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.badge {
  font-size: 12px;
  color: #a1a1aa;
  background: #202024;
  border: 1px solid #2e2e34;
  padding: 4px 10px;
  border-radius: 6px;
}

.hero {
  text-align: center;
  margin-bottom: 24px;
}

.hero-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 14px;
  border-radius: 16px;
  background: #222227;
  border: 1px solid #32323a;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
}

.hero-icon.pulsing {
  animation: pulse 1.4s infinite;
  background: #dc2626;
  border-color: #ef4444;
  color: #ffffff;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
  }
  50% {
    box-shadow: 0 0 0 14px rgba(239, 68, 68, 0);
  }
}

.hero h2 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #f4f4f5;
}

.hero p {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: #a1a1aa;
}

.recording-stats {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 15px !important;
  color: #f4f4f5 !important;
}

.timer {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  color: #ef4444;
}

.clicks {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #d4d4d8;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}

.countdown-toggle {
  grid-column: span 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: #a1a1aa;
  cursor: pointer;
}

.countdown-box {
  text-align: center;
  padding: 20px 0 28px;
}

.countdown-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #dc2626;
  color: #ffffff;
  font-size: 34px;
  font-weight: 700;
  margin-bottom: 10px;
}

.countdown-box p {
  margin: 0;
  font-size: 13px;
  color: #d4d4d8;
}

.opt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #2c2c32;
  background: #202024;
  color: #a1a1aa;
  font-size: 13px;
  cursor: pointer;
}

.opt-btn.active {
  border-color: #52525b;
  background: #27272c;
  color: #ffffff;
}

.cam-preview {
  display: block;
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 50%;
  margin: 0 auto 20px;
  border: 3px solid #3f3f46;
  transform: scaleX(-1);
}

.error-tip {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  margin-bottom: 16px;
}

.start-btn,
.stop-btn {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 13px 18px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.start-btn {
  background: #dc2626;
}

.start-btn:hover {
  background: #ef4444;
}

.stop-btn {
  background: #f4f4f5;
  color: #141416;
}

.recording-actions {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
}

.pause-btn {
  border: 1px solid #3f3f46;
  border-radius: 10px;
  padding: 13px 14px;
  font-size: 14px;
  font-weight: 600;
  background: #202024;
  color: #f4f4f5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.pause-btn:hover {
  background: #2a2a30;
}

.start-btn:disabled,
.pause-btn:disabled,
.stop-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
