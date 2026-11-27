<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { AppFooterLink } from '@100free/ui';
import type { CleanRedirectSettings, RedirectStats } from '../../src/types';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from '../../src/utils/storage';
import { extractTargetUrl, KNOWN_PLATFORM_RULES } from '../../src/rules/redirect-rules';
import { cleanTrackingParams } from '../../src/rules/tracking-rules';
import { m } from '../../src/locales';

const settings = reactive<CleanRedirectSettings>({ ...DEFAULT_SETTINGS });
const stats = reactive<RedirectStats>({ ...DEFAULT_STATS });
const isLoaded = ref(false);
const testInput = ref('');
const copied = ref(false);
const showPlatformList = ref(false);
const toastText = ref('');

// 实时净化测试计算
const testResult = computed(() => {
  const raw = testInput.value.trim();
  if (!raw) return null;

  let target = raw;
  let isRedirect = false;
  let platformName = '';

  const redirectMatch = extractTargetUrl(raw, settings.heuristicRedirectEnabled);
  if (redirectMatch && redirectMatch.targetUrl) {
    target = redirectMatch.targetUrl;
    isRedirect = true;
    platformName = redirectMatch.platformName || m.platforms.heuristic;
  }

  const { cleanedUrl, removedCount } = cleanTrackingParams(target);

  return {
    isRedirect,
    platformName,
    cleanedUrl,
    removedCount,
    isChanged: raw !== cleanedUrl
  };
});

// 加载设置与统计数据
onMounted(async () => {
  document.title = m.docTitle;
  try {
    const resSettings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (resSettings?.settings) {
      Object.assign(settings, resSettings.settings);
    }
    const resStats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    if (resStats?.stats) {
      Object.assign(stats, resStats.stats);
    }
  } catch (e) {
    console.error('Failed to load initial data', e);
  } finally {
    isLoaded.value = true;
  }

  // 尝试自动获取当前活动标签页的 URL 填入测试输入框
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && tab.url.startsWith('http')) {
      testInput.value = tab.url;
    }
  } catch {
    // ignore
  }
});

// 保存设置
const updateSetting = async (key: keyof CleanRedirectSettings, val: boolean) => {
  settings[key] = val;
  try {
    await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings: { [key]: val }
    });
    showToast(m.toastSettingsSaved);
  } catch (e) {
    console.error('Failed to save setting', e);
  }
};

// 复制纯净链接
const copyCleanedUrl = async () => {
  if (!testResult.value?.cleanedUrl) return;
  try {
    await navigator.clipboard.writeText(testResult.value.cleanedUrl);
    copied.value = true;
    showToast(m.toastCopiedUrl);
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error('Failed to copy', e);
  }
};

// 粘贴剪贴板
const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      testInput.value = text.trim();
      showToast(m.toastPastedUrl);
    }
  } catch {
    showToast(m.toastPasteFailed);
  }
};

// 重置统计
const resetStats = async () => {
  stats.bypassedCount = 0;
  stats.cleanedParamsCount = 0;
  await chrome.storage.local.set({ clean_redirect_stats: { bypassedCount: 0, cleanedParamsCount: 0 } });
  showToast(m.toastStatsReset);
};

const showToast = (msg: string) => {
  toastText.value = msg;
  setTimeout(() => {
    if (toastText.value === msg) {
      toastText.value = '';
    }
  }, 2200);
};
</script>

<template>
  <div class="popup-container">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <div class="logo-box">
          <svg class="logo-svg" viewBox="0 0 128 128" width="28" height="28">
            <defs>
              <linearGradient id="popBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#34d399" />
                <stop offset="100%" stop-color="#38bdf8" />
              </linearGradient>
            </defs>
            <path d="M48 72 L36 84 A15 15 0 0 1 14 62 L26 50 A15 15 0 0 1 48 50" fill="none" stroke="#38bdf8" stroke-width="8" stroke-linecap="round" />
            <path d="M80 56 L92 44 A15 15 0 0 1 114 66 L102 78 A15 15 0 0 1 80 78" fill="none" stroke="#34d399" stroke-width="8" stroke-linecap="round" />
            <polygon points="72,28 46,65 62,65 52,100 86,59 68,59" fill="url(#popBoltGrad)" stroke="#ffffff" stroke-width="3" />
          </svg>
        </div>
        <div>
          <div class="title-row">
            <h1 class="main-title">{{ m.extTitle }}</h1>
            <span class="version-tag">v1.0.0</span>
          </div>
          <p class="sub-title">{{ m.extSub }}</p>
        </div>
      </div>
      <div class="status-indicator">
        <span class="status-dot"></span>
        <span>{{ m.statusActive }}</span>
      </div>
    </header>

    <!-- Data Counters -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon">⚡</div>
        <div class="stat-info">
          <div class="stat-num">{{ stats.bypassedCount }}</div>
          <div class="stat-label">{{ m.statBypassed }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🛡️</div>
        <div class="stat-info">
          <div class="stat-num">{{ stats.cleanedParamsCount }}</div>
          <div class="stat-label">{{ m.statCleaned }}</div>
        </div>
      </div>
    </div>

    <!-- Feature Switches Matrix -->
    <section class="section-card">
      <div class="section-title">{{ m.engineTitle }}</div>
      <div class="switches-list">
        <div class="switch-item">
          <div class="switch-info">
            <div class="switch-title">{{ m.swAutoRedirectTitle }}</div>
            <div class="switch-desc">{{ m.swAutoRedirectDesc }}</div>
          </div>
          <label class="toggle-btn">
            <input
              type="checkbox"
              :checked="settings.autoRedirectEnabled"
              @change="updateSetting('autoRedirectEnabled', ($event.target as HTMLInputElement).checked)"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div class="switch-item">
          <div class="switch-info">
            <div class="switch-title">{{ m.swPreCleanTitle }}</div>
            <div class="switch-desc">{{ m.swPreCleanDesc }}</div>
          </div>
          <label class="toggle-btn">
            <input
              type="checkbox"
              :checked="settings.preCleanLinksEnabled"
              @change="updateSetting('preCleanLinksEnabled', ($event.target as HTMLInputElement).checked)"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div class="switch-item">
          <div class="switch-info">
            <div class="switch-title">{{ m.swCleanTrackingTitle }}</div>
            <div class="switch-desc">{{ m.swCleanTrackingDesc }}</div>
          </div>
          <label class="toggle-btn">
            <input
              type="checkbox"
              :checked="settings.cleanTrackingEnabled"
              @change="updateSetting('cleanTrackingEnabled', ($event.target as HTMLInputElement).checked)"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div class="switch-item">
          <div class="switch-info">
            <div class="switch-title">{{ m.swStripCopyTitle }}</div>
            <div class="switch-desc">{{ m.swStripCopyDesc }}</div>
          </div>
          <label class="toggle-btn">
            <input
              type="checkbox"
              :checked="settings.stripCopyCopyrightEnabled"
              @change="updateSetting('stripCopyCopyrightEnabled', ($event.target as HTMLInputElement).checked)"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div class="switch-item">
          <div class="switch-info">
            <div class="switch-title">{{ m.swHeuristicTitle }}</div>
            <div class="switch-desc">{{ m.swHeuristicDesc }}</div>
          </div>
          <label class="toggle-btn">
            <input
              type="checkbox"
              :checked="settings.heuristicRedirectEnabled"
              @change="updateSetting('heuristicRedirectEnabled', ($event.target as HTMLInputElement).checked)"
            />
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </section>

    <!-- Interactive URL Purification Sandbox -->
    <section class="section-card">
      <div class="section-header-flex">
        <div class="section-title">{{ m.sandboxTitle }}</div>
        <button class="paste-btn" @click="pasteFromClipboard">
          {{ m.pasteBtn }}
        </button>
      </div>

      <div class="input-wrap">
        <textarea
          v-model="testInput"
          :placeholder="m.sandboxPlaceholder"
          rows="2"
          class="test-textarea"
        ></textarea>
        <button v-if="testInput" class="clear-input-btn" @click="testInput = ''">✕</button>
      </div>

      <!-- Result Card -->
      <div v-if="testResult" class="result-box">
        <div class="result-badges">
          <span v-if="testResult.isRedirect" class="badge badge-redirect">
            {{ m.badgeRedirect(testResult.platformName) }}
          </span>
          <span v-if="testResult.removedCount > 0" class="badge badge-tracking">
            {{ m.badgeTracking(testResult.removedCount) }}
          </span>
          <span v-if="!testResult.isChanged" class="badge badge-clean">
            {{ m.badgeClean }}
          </span>
        </div>

        <div class="clean-url-display">
          <div class="url-text">{{ testResult.cleanedUrl }}</div>
          <button class="copy-url-btn" :class="{ success: copied }" @click="copyCleanedUrl">
            {{ copied ? m.copiedBtn : m.copyUrlBtn }}
          </button>
        </div>
      </div>
    </section>

    <!-- Supported Platforms Drawer -->
    <section class="section-card">
      <div class="platforms-header" @click="showPlatformList = !showPlatformList">
        <div class="section-title" style="margin: 0;">{{ m.platformsTitle(KNOWN_PLATFORM_RULES.length) }}</div>
        <div class="toggle-arrow" :class="{ expanded: showPlatformList }">▾</div>
      </div>

      <div v-if="showPlatformList" class="platforms-grid">
        <div v-for="rule in KNOWN_PLATFORM_RULES" :key="rule.id" class="platform-chip">
          <span class="platform-dot"></span>
          <span>{{ rule.name }}</span>
        </div>
        <div class="platform-chip platform-chip-any">
          <span class="platform-dot"></span>
          <span>{{ m.platformHeuristic }}</span>
        </div>
      </div>
    </section>

    <!-- Footer Actions -->
    <footer class="footer">
      <button class="text-btn" @click="resetStats">{{ m.resetStatsBtn }}</button>
      <span class="footer-divider">·</span>
      <span class="footer-slogan">{{ m.footerSlogan }}</span>
    </footer>

    <!-- Toast Notification -->
    <transition name="fade">
      <div v-if="toastText" class="toast">{{ toastText }}</div>
    </transition>
    <AppFooterLink plugin-id="clean-redirect" />
  </div>
</template>

<style scoped>
.popup-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 4px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-box {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #059669, #0d9488, #0284c7);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
}
.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.main-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #f8fafc;
  letter-spacing: -0.2px;
}
.version-tag {
  font-size: 10px;
  font-weight: 600;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  padding: 1px 6px;
  border-radius: 6px;
}
.sub-title {
  font-size: 11px;
  color: #94a3b8;
  margin: 2px 0 0 0;
}
.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  color: #34d399;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: pulse 2s infinite;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.stat-card {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.stat-icon {
  font-size: 20px;
}
.stat-num {
  font-size: 18px;
  font-weight: 800;
  color: #f1f5f9;
  line-height: 1.1;
}
.stat-label {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

/* Section Cards */
.section-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 12px 14px;
}
.section-title {
  font-size: 12px;
  font-weight: 700;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.section-header-flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.paste-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #38bdf8;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.paste-btn:hover {
  background: rgba(56, 189, 248, 0.15);
}

/* Switches List */
.switches-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}
.switch-info {
  max-width: 320px;
}
.switch-title {
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
}
.switch-desc {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

/* Toggle Switch */
.toggle-btn {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 22px;
  flex-shrink: 0;
}
.toggle-btn input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #334155;
  transition: 0.25s;
  border-radius: 22px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.25s;
  border-radius: 50%;
}
input:checked + .slider {
  background: linear-gradient(135deg, #10b981, #06b6d4);
}
input:checked + .slider:before {
  transform: translateX(16px);
}

/* Interactive Sandbox */
.input-wrap {
  position: relative;
}
.test-textarea {
  width: 100%;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #f1f5f9;
  font-size: 11.5px;
  font-family: monospace;
  padding: 8px 30px 8px 10px;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}
.test-textarea:focus {
  border-color: #38bdf8;
}
.clear-input-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.clear-input-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.1);
}

/* Result Box */
.result-box {
  margin-top: 10px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px dashed rgba(56, 189, 248, 0.25);
  border-radius: 10px;
  padding: 10px;
}
.result-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}
.badge-redirect {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.badge-tracking {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.badge-clean {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}
.clean-url-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 6px 10px;
  border-radius: 8px;
}
.url-text {
  font-size: 11px;
  font-family: monospace;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}
.copy-url-btn {
  background: linear-gradient(135deg, #059669, #0284c7);
  border: none;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.copy-url-btn:hover {
  filter: brightness(1.1);
}
.copy-url-btn.success {
  background: #10b981;
}

/* Platforms Accordion */
.platforms-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}
.toggle-arrow {
  color: #94a3b8;
  font-size: 14px;
  transition: transform 0.2s;
}
.toggle-arrow.expanded {
  transform: rotate(180deg);
}
.platforms-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.platform-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: #cbd5e1;
}
.platform-chip-any {
  background: rgba(56, 189, 248, 0.1);
  color: #38bdf8;
}
.platform-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #10b981;
}

/* Footer */
.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11px;
  color: #64748b;
  padding: 4px 0;
}
.text-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 11px;
  padding: 0;
}
.text-btn:hover {
  color: #cbd5e1;
  text-decoration: underline;
}
.footer-divider {
  color: #475569;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  pointer-events: none;
  white-space: nowrap;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}
</style>
