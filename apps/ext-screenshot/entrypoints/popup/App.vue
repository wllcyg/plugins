<script setup lang="ts">
import { ref } from 'vue';
import { AppFooterLink } from '@100free/ui';
import { Camera, Image as ImageIcon, Monitor, Globe, Scan, ArrowDownCircle, Crop } from 'lucide-vue-next';
import { t } from '../../src/utils/i18n';

const isCapturing = ref(false);
const captureError = ref('');

// 健壮的消息调度器：如果检测到页面尚未注入 Content Script（如重载插件后未刷新网页），自动动态注入并重试
const sendTabMessage = async (tabId: number, message: Record<string, unknown>) => {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err: unknown) {
    const errorMsg = String(err);
    if (errorMsg.includes('Receiving end does not exist') || errorMsg.includes('Could not establish connection')) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content-scripts/content.js']
        });
        await new Promise((r) => setTimeout(r, 100));
        return await chrome.tabs.sendMessage(tabId, message);
      } catch (injectErr) {
        const reason = String(injectErr);
        if (/Cannot access|Missing host permission|extensions gallery/i.test(reason)) {
          captureError.value = t('capturePageRestricted');
          return false;
        }
        throw injectErr;
      }
    }
    throw err;
  }
};

const startCapture = async (message: Record<string, unknown>) => {
  if (isCapturing.value) return;
  isCapturing.value = true;
  captureError.value = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ? new URL(tab.url) : undefined;
    if (!tab?.id || !url || !['http:', 'https:', 'file:'].includes(url.protocol) ||
        url.hostname === 'chromewebstore.google.com' ||
        (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) {
      captureError.value = t('capturePageRestricted');
      return;
    }
    const response = await sendTabMessage(tab.id, message);
    if (response?.success) window.close();
    else if (!captureError.value) captureError.value = t('captureStartFailed');
  } catch {
    captureError.value = t('captureStartFailed');
  } finally {
    isCapturing.value = false;
  }
};

const captureFullPage = (hd = false) => startCapture({ type: 'START_FULL_PAGE_CAPTURE', hd });
const captureMode = (type: string) => startCapture({ type });

const openPortal = () => {
  chrome.tabs.create({ url: 'http://localhost:5173' });
  window.close();
};
</script>

<template>
  <div class="menu-container">
    <p v-if="captureError" class="capture-error" role="alert">{{ captureError }}</p>
    <!-- 主操作菜单列表 -->
    <div class="menu-group">
      <!-- 截图整个页面 -->
      <button class="menu-item" @click="captureFullPage(false)">
        <div class="item-left">
          <Camera class="item-icon icon-blue" />
          <span class="item-label">{{ t('captureFullPage') }}</span>
        </div>
        <div class="item-right">
          <span class="shortcut-key">Ctrl+Shift+7</span>
        </div>
      </button>

      <!-- 高清整页截图（2x 矢量级超清） -->
      <button class="menu-item highlight-item" @click="captureFullPage(true)">
        <div class="item-left">
          <ImageIcon class="item-icon icon-purple" />
          <span class="item-label">{{ t('captureFullPageHd') }}</span>
        </div>
        <div class="item-right">
          <span class="free-badge">2x 免费</span>
          <span class="shortcut-key">Ctrl+Shift+8</span>
        </div>
      </button>

      <button class="menu-item" @click="captureMode('START_SCROLL_AREA_CAPTURE')">
        <div class="item-left">
          <Scan class="item-icon icon-blue" />
          <span class="item-label">{{ t('captureScrollArea') }}</span>
        </div>
      </button>

      <button class="menu-item" @click="captureMode('START_CURRENT_POSITION_CAPTURE')">
        <div class="item-left">
          <ArrowDownCircle class="item-icon icon-blue" />
          <span class="item-label">{{ t('captureCurrentPosition') }}</span>
        </div>
      </button>

      <!-- 截图可见部分 -->
      <button class="menu-item" @click="captureMode('CAPTURE_VISIBLE_ONLY')">
        <div class="item-left">
          <Monitor class="item-icon icon-cyan" />
          <span class="item-label">{{ t('captureVisible') }}</span>
        </div>
      </button>
      <button class="menu-item" @click="captureMode('START_SELECTED_AREA_CAPTURE')">
        <div class="item-left">
          <Crop class="item-icon icon-cyan" />
          <span class="item-label">{{ t('captureSelected') }}</span>
        </div>
      </button>
    </div>

    <!-- 优雅分隔线 -->
    <div class="menu-divider"></div>

    <!-- 辅助选项组 -->
    <div class="menu-group">
      <button class="menu-item sub-item" @click="openPortal">
        <div class="item-left">
          <Globe class="item-icon icon-emerald" />
          <span class="item-label">100-Free 免费插件计划</span>
        </div>
        <div class="item-right">
          <span class="status-dot"></span>
        </div>
      </button>
    </div>
    <AppFooterLink plugin-id="screenshot" />
  </div>
</template>

<style scoped>
.menu-container {
  width: 280px;
  background-color: #ffffff;
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  user-select: none;
  box-sizing: border-box;
  padding: 6px 0;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
}

.capture-error {
  margin: 6px 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #eff6ff;
  color: #1e3a8a;
  font-size: 12px;
  line-height: 1.5;
}

.menu-group {
  display: flex;
  flex-direction: column;
}

.menu-item {
  width: 100%;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  cursor: pointer;
  text-align: left;
  outline: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.menu-item:hover {
  background-color: #f1f5f9;
}

.highlight-item:hover {
  background-color: #f5f3ff;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.icon-blue {
  color: #0284c7;
}

.icon-purple {
  color: #7c3aed;
}

.icon-cyan {
  color: #0d9488;
}

.icon-emerald {
  color: #059669;
}

.item-label {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
}

.menu-item:hover .item-label {
  color: #0f172a;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.free-badge {
  font-size: 10px;
  font-weight: 700;
  color: #7c3aed;
  background-color: #ede9fe;
  border: 1px solid #ddd6fe;
  border-radius: 4px;
  padding: 1px 5px;
  letter-spacing: 0.3px;
}

.shortcut-key {
  font-size: 11px;
  color: #94a3b8;
  font-family: inherit;
  border: 1px solid #e2e8f0;
  background-color: #f8fafc;
  padding: 1px 5px;
  border-radius: 4px;
}

.menu-divider {
  height: 1px;
  background-color: #f1f5f9;
  margin: 5px 0;
}

.sub-item .item-label {
  font-size: 12.5px;
  color: #475569;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
}
</style>
