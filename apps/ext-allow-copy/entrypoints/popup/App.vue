<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ExtensionStorage } from '@100free/core';
import { CopySettings, DEFAULT_SETTINGS, STORAGE_KEY } from '../../src/types';

const settings = ref<CopySettings>({ ...DEFAULT_SETTINGS });
const currentHost = ref<string>('');
const isSpecialPage = ref(false);
const testText = ref('这是一段用于测试复制的文本，选我试试看！');
const testCopySuccess = ref(false);

const isSiteEnabled = computed(() => {
  if (!currentHost.value) return settings.value.enabled;
  const explicit = settings.value.siteRules[currentHost.value];
  return explicit !== undefined ? explicit : settings.value.enabled;
});

const loadState = async () => {
  const saved = await ExtensionStorage.get<CopySettings>(STORAGE_KEY, DEFAULT_SETTINGS);
  if (saved) {
    settings.value = { ...DEFAULT_SETTINGS, ...saved };
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
        currentHost.value = new URL(tab.url).hostname;
      } else {
        isSpecialPage.value = true;
      }
    }
  } catch {
    currentHost.value = '';
  }
};

const saveSettings = async () => {
  await ExtensionStorage.set(STORAGE_KEY, settings.value);
};

const toggleCurrentSite = async () => {
  if (!currentHost.value) {
    settings.value.enabled = !settings.value.enabled;
  } else {
    const nextState = !isSiteEnabled.value;
    settings.value.siteRules = {
      ...settings.value.siteRules,
      [currentHost.value]: nextState
    };
  }
  await saveSettings();
};

const toggleStrictMode = async () => {
  settings.value.strictMode = !settings.value.strictMode;
  await saveSettings();
};

const toggleFloatButton = async () => {
  settings.value.showFloatButton = !settings.value.showFloatButton;
  await saveSettings();
};

// 触发页面框选提取文本
const startSnipping = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'START_SNIPPING' });
      window.close(); // 关闭 popup 方便用户直接在网页上框选
    }
  } catch (err) {
    console.error('无法启动框选', err);
  }
};

const handleTestCopy = async () => {
  try {
    await navigator.clipboard.writeText(testText.value);
    testCopySuccess.value = true;
    setTimeout(() => {
      testCopySuccess.value = false;
    }, 1500);
  } catch {
    const el = document.createElement('textarea');
    el.value = testText.value;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
    testCopySuccess.value = true;
    setTimeout(() => {
      testCopySuccess.value = false;
    }, 1500);
  }
};

onMounted(() => {
  loadState();
});
</script>

<template>
  <div class="popup-box">
    <!-- 头部 -->
    <header class="header">
      <div class="title-row">
        <div class="logo-wrap">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </div>
        <div class="title-meta">
          <h3 class="title">网页超级自由复制</h3>
          <p class="subtitle">解禁右键 · 穿透防选 · 框选极速提取</p>
        </div>
      </div>
      <span class="badge">PRO</span>
    </header>

    <!-- 当前站点状态主控卡片 -->
    <div class="site-card" :class="{ 'is-active': isSiteEnabled && !isSpecialPage }">
      <div class="site-info">
        <span class="site-label">当前站点保护状态</span>
        <span class="site-host" :title="currentHost">
          {{ isSpecialPage ? '系统/特殊页面' : (currentHost || '未获取到网址') }}
        </span>
      </div>
      <button
        v-if="!isSpecialPage"
        class="switch-btn"
        :class="{ 'switch-active': isSiteEnabled }"
        @click="toggleCurrentSite"
      >
        <span class="switch-handle" />
      </button>
      <span v-else class="special-hint">无需解禁</span>
    </div>

    <!-- 终极武器：框选提取文字按钮 -->
    <button v-if="!isSpecialPage" class="snipping-hero-btn" @click="startSnipping">
      <svg class="snipping-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 7V4h3m10 0h3v3M4 17v3h3m10 0h3v-3" />
        <rect x="8" y="8" width="8" height="8" rx="1" />
      </svg>
      <div class="snipping-copy">
        <span class="snipping-title">框选截取文字 (穿透 Canvas)</span>
        <span class="snipping-desc">遇到无法划词的图文或文库，直接拖拽框选提取</span>
      </div>
    </button>

    <!-- 选项列表 -->
    <div class="settings-group">
      <div class="setting-item" @click="toggleFloatButton">
        <div class="item-text">
          <span class="item-title">划词快捷复制小胶囊</span>
          <span class="item-desc">选中文本时鼠标旁自动浮现一键复制按钮</span>
        </div>
        <button class="mini-switch" :class="{ 'mini-active': settings.showFloatButton }">
          <span class="mini-handle" />
        </button>
      </div>

      <div class="setting-item" @click="toggleStrictMode">
        <div class="item-text">
          <span class="item-title">强力穿透模式 (Strict Mode)</span>
          <span class="item-desc">攻破百度文库、PDF 隐藏文字层与防清空选区</span>
        </div>
        <button class="mini-switch" :class="{ 'mini-active': settings.strictMode }">
          <span class="mini-handle" />
        </button>
      </div>
    </div>

    <!-- 快速体验/测试卡片 -->
    <div class="test-card">
      <div class="test-header">
        <span class="test-title">剪贴板功能速测</span>
        <span v-if="testCopySuccess" class="copy-tag">已复制成功 ✓</span>
      </div>
      <div class="test-body">
        <input v-model="testText" class="test-input" readonly />
        <button class="copy-action-btn" @click="handleTestCopy">
          复制测试
        </button>
      </div>
    </div>

    <!-- 底部保障声明 -->
    <footer class="footer">
      <span>100-Free 开源生产力计划 · 纯净无后台 · 100% 本地运算</span>
    </footer>
  </div>
</template>

<style scoped>
.popup-box {
  width: 340px;
  box-sizing: border-box;
  padding: 16px;
  background-color: #ffffff;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  user-select: none;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
}

.logo-icon {
  width: 18px;
  height: 18px;
}

.title-meta {
  display: flex;
  flex-direction: column;
}

.title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.subtitle {
  margin: 2px 0 0;
  font-size: 10px;
  color: #64748b;
}

.badge {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

/* 主状态卡片 */
.site-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 10px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  margin-bottom: 10px;
  transition: all 0.2s ease;
}

.site-card.is-active {
  background-color: #eff6ff;
  border-color: #93c5fd;
}

.site-info {
  display: flex;
  flex-direction: column;
  max-width: 220px;
}

.site-label {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
}

.site-host {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.special-hint {
  font-size: 11px;
  color: #94a3b8;
}

/* 开关按钮 */
.switch-btn {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background-color: #cbd5e1;
  border: none;
  cursor: pointer;
  position: relative;
  padding: 2px;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.switch-active {
  background-color: #2563eb;
}

.switch-handle {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.switch-active .switch-handle {
  transform: translateX(20px);
}

/* 框选提取大按钮 */
.snipping-hero-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: #ffffff;
  border: 1px solid #334155;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 10px;
  text-align: left;
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.15);
  transition: all 0.15s ease;
}

.snipping-hero-btn:hover {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  transform: translateY(-1px);
}

.snipping-icon {
  width: 22px;
  height: 22px;
  color: #60a5fa;
  flex-shrink: 0;
}

.snipping-copy {
  display: flex;
  flex-direction: column;
}

.snipping-title {
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
}

.snipping-desc {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 1px;
}

/* 选项列表 */
.settings-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  background-color: #ffffff;
  border: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.15s ease;
}

.setting-item:hover {
  background-color: #f8fafc;
  border-color: #e2e8f0;
}

.item-text {
  display: flex;
  flex-direction: column;
  padding-right: 8px;
}

.item-title {
  font-size: 11px;
  font-weight: 600;
  color: #334155;
}

.item-desc {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 1px;
  line-height: 1.25;
}

.mini-switch {
  width: 30px;
  height: 16px;
  border-radius: 8px;
  background-color: #e2e8f0;
  border: none;
  cursor: pointer;
  position: relative;
  padding: 2px;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.mini-active {
  background-color: #2563eb;
}

.mini-handle {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.mini-active .mini-handle {
  transform: translateX(14px);
}

/* 测试卡片 */
.test-card {
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 10px;
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.test-title {
  font-size: 10px;
  font-weight: 600;
  color: #475569;
}

.copy-tag {
  font-size: 10px;
  color: #059669;
  font-weight: 600;
}

.test-body {
  display: flex;
  gap: 6px;
}

.test-input {
  flex: 1;
  font-size: 11px;
  padding: 5px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: #ffffff;
  color: #475569;
  outline: none;
}

.copy-action-btn {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  background-color: #1e293b;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  white-space: nowrap;
}

.copy-action-btn:hover {
  background-color: #334155;
}

/* 底部 */
.footer {
  border-top: 1px solid #f1f5f9;
  padding-top: 8px;
  text-align: center;
  font-size: 10px;
  color: #94a3b8;
}
</style>
