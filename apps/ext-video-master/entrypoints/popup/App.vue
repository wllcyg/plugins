<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { AppFooterLink } from '@100free/ui';
import { VideoSettings, DEFAULT_SETTINGS } from '../../src/types';
import { m } from '../../src/locales';

const settings = ref<VideoSettings>({ ...DEFAULT_SETTINGS });
const videoCount = ref<number>(0);
const isPiP = ref<boolean>(false);
const activeTabId = ref<number | null>(null);

const speedPresets = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0];
const volumePresets = [1.0, 1.5, 2.0, 3.0, 4.0, 5.0];

// 向当前标签页同步设置
const syncSettings = async () => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ video_master_settings: JSON.parse(JSON.stringify(settings.value)) });
    }

    if (activeTabId.value) {
      chrome.tabs.sendMessage(activeTabId.value, {
        action: 'UPDATE_SETTINGS',
        settings: JSON.parse(JSON.stringify(settings.value))
      }).catch(() => {});
    }
  } catch {}
};

const setSpeed = (val: number) => {
  settings.value.playbackRate = parseFloat(val.toFixed(2));
  syncSettings();
};

const setVolume = (val: number) => {
  settings.value.volumeBoost = parseFloat(val.toFixed(2));
  syncSettings();
};

const togglePiP = async () => {
  if (!activeTabId.value) return;
  try {
    const res = await chrome.tabs.sendMessage(activeTabId.value, { action: 'TOGGLE_PIP' });
    if (res) isPiP.value = res.isPiP;
  } catch {}
};

const captureFrame = async () => {
  if (!activeTabId.value) return;
  try {
    await chrome.tabs.sendMessage(activeTabId.value, { action: 'CAPTURE_FRAME' });
  } catch {}
};

onMounted(async () => {
  document.title = m.extTitle;
  try {
    // 1. 读取 storage 本地存储
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const stored = await chrome.storage.local.get('video_master_settings');
      if (stored?.video_master_settings) {
        settings.value = { ...DEFAULT_SETTINGS, ...stored.video_master_settings };
      }
    }

    // 2. 查询当前激活标签页并获取视频状态
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      activeTabId.value = tab.id;
      const res = await chrome.tabs.sendMessage(tab.id, { action: 'GET_VIDEO_STATE' }).catch(() => null);
      if (res) {
        videoCount.value = res.videoCount || 0;
        isPiP.value = !!res.isPiP;
        if (res.settings) {
          settings.value = { ...settings.value, ...res.settings };
        }
      }
    }
  } catch {}
});
</script>

<template>
  <div class="video-panel">
    <!-- 头部品牌 -->
    <header class="panel-header">
      <div class="brand">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" opacity="0.2" />
            <polygon points="5 3 19 12 5 21 5 3" />
            <path d="M13 3l-4 9h5l-3 9" stroke="#fbbf24" stroke-width="2.5" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="brand-text">
          <h2 class="title">{{ m.extTitle }}</h2>
          <p class="subtitle" :class="{ 'has-video': videoCount > 0 }">
            {{ videoCount > 0 ? m.readyStreams(videoCount) : m.noVideo }}
          </p>
        </div>
      </div>
      <span class="pro-tag">FREE</span>
    </header>

    <!-- 倍速调节主控区 -->
    <section class="section speed-section">
      <div class="section-title-row">
        <span class="section-label">{{ m.playbackSpeed }}</span>
        <div class="speed-badge">{{ settings.playbackRate.toFixed(2) }}x</div>
      </div>

      <!-- 滑块 -->
      <div class="slider-box">
        <input
          v-model.number="settings.playbackRate"
          type="range"
          min="0.1"
          max="8.0"
          step="0.05"
          class="custom-slider"
          @input="syncSettings"
        />
        <div class="slider-marks">
          <span>0.1x</span>
          <span>1.0x</span>
          <span>2.0x</span>
          <span>4.0x</span>
          <span>8.0x</span>
        </div>
      </div>

      <!-- 快捷档位预设 -->
      <div class="pills-grid">
        <button
          v-for="rate in speedPresets"
          :key="rate"
          class="pill-btn"
          :class="{ 'pill-active': Math.abs(settings.playbackRate - rate) < 0.02 }"
          @click="setSpeed(rate)"
        >
          {{ rate }}x
        </button>
      </div>
    </section>

    <!-- 音量突破与增强 -->
    <section class="section volume-section">
      <div class="section-title-row">
        <span class="section-label">{{ m.volumeBoost }}</span>
        <span class="vol-badge">{{ Math.round(settings.volumeBoost * 100) }}%</span>
      </div>

      <div class="slider-box">
        <input
          v-model.number="settings.volumeBoost"
          type="range"
          min="1.0"
          max="6.0"
          step="0.1"
          class="custom-slider vol-slider"
          @input="syncSettings"
        />
      </div>

      <div class="pills-grid vol-pills">
        <button
          v-for="vol in volumePresets"
          :key="vol"
          class="pill-btn"
          :class="{ 'pill-active': Math.abs(settings.volumeBoost - vol) < 0.05 }"
          @click="setVolume(vol)"
        >
          {{ vol === 1.0 ? m.originalVolume : `${Math.round(vol * 100)}%` }}
        </button>
      </div>
    </section>

    <!-- 快捷功能双按键 -->
    <section class="action-grid">
      <button class="action-card pip-card" :class="{ 'card-highlight': isPiP }" @click="togglePiP">
        <div class="card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <rect x="11" y="9" width="9" height="6" rx="1" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
        <div class="card-text">
          <strong>{{ isPiP ? m.exitPip : m.enterPip }}</strong>
          <small>{{ m.pipSub }}</small>
        </div>
      </button>

      <button class="action-card capture-card" @click="captureFrame">
        <div class="card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <div class="card-text">
          <strong>{{ m.captureFrame }}</strong>
          <small>{{ m.captureSub }}</small>
        </div>
      </button>
    </section>

    <!-- 增强开关组 -->
    <section class="switches-list">
      <label class="switch-row">
        <div class="switch-info">
          <span class="switch-title">{{ m.antiPauseTitle }}</span>
          <span class="switch-desc">{{ m.antiPauseDesc }}</span>
        </div>
        <input v-model="settings.antiPause" type="checkbox" class="toggle-checkbox" @change="syncSettings" />
      </label>

      <label class="switch-row">
        <div class="switch-info">
          <span class="switch-title">{{ m.osdTitle }}</span>
          <span class="switch-desc">{{ m.osdDesc }}</span>
        </div>
        <input v-model="settings.showOsdBadge" type="checkbox" class="toggle-checkbox" @change="syncSettings" />
      </label>

      <label class="switch-row">
        <div class="switch-info">
          <span class="switch-title">{{ m.shortcutsTitle }}</span>
          <span class="switch-desc">{{ m.shortcutsDesc }}</span>
        </div>
        <input v-model="settings.shortcutsEnabled" type="checkbox" class="toggle-checkbox" @change="syncSettings" />
      </label>
    </section>

    <!-- 底部版权 -->
    <footer class="panel-footer">
      <span>{{ m.footerSlogan }}</span>
    </footer>
    <AppFooterLink plugin-id="video-master" />
  </div>
</template>

<style scoped>
.video-panel {
  width: 380px;
  background-color: #ffffff;
  color: #0f172a;
  box-sizing: border-box;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
}

.logo svg {
  width: 20px;
  height: 20px;
}

.title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: #94a3b8;
}

.subtitle.has-video {
  color: #10b981;
  font-weight: 600;
}

.pro-tag {
  font-size: 10px;
  font-weight: 700;
  color: #8b5cf6;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  padding: 2px 7px;
  border-radius: 4px;
}

/* 通用 Section */
.section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.speed-badge {
  font-size: 18px;
  font-weight: 800;
  color: #6366f1;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.vol-badge {
  font-size: 14px;
  font-weight: 700;
  color: #f59e0b;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.slider-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.custom-slider {
  width: 100%;
  height: 6px;
  accent-color: #6366f1;
  cursor: pointer;
}

.vol-slider {
  accent-color: #f59e0b;
}

.slider-marks {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #94a3b8;
}

/* 档位药丸 */
.pills-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.vol-pills {
  grid-template-columns: repeat(3, 1fr);
}

.pill-btn {
  padding: 4px 0;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.pill-btn:hover {
  border-color: #c7d2fe;
  color: #6366f1;
}

.pill-active {
  background: #6366f1;
  color: #ffffff;
  border-color: #6366f1;
}

.vol-pills .pill-active {
  background: #f59e0b;
  border-color: #f59e0b;
}

/* 操作卡片双列 */
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.action-card:hover {
  border-color: #c7d2fe;
  background: #f5f3ff;
  transform: translateY(-1px);
}

.card-highlight {
  border-color: #8b5cf6;
  background: #f5f3ff;
}

.card-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;
  flex-shrink: 0;
}

.card-icon svg {
  width: 18px;
  height: 18px;
}

.card-text {
  display: flex;
  flex-direction: column;
}

.card-text strong {
  font-size: 12px;
  color: #1e293b;
}

.card-text small {
  font-size: 10px;
  color: #94a3b8;
}

/* 开关列表 */
.switches-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.switch-info {
  display: flex;
  flex-direction: column;
  max-width: 300px;
}

.switch-title {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.switch-desc {
  font-size: 10px;
  color: #94a3b8;
}

.toggle-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #6366f1;
  cursor: pointer;
}

/* 底部 */
.panel-footer {
  border-top: 1px solid #f8fafc;
  padding-top: 4px;
  text-align: center;
  font-size: 10px;
  color: #94a3b8;
}
</style>
