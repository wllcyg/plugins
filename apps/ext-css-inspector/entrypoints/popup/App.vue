<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ExtensionStorage } from '@100free/core';
import { InspectorSettings, DEFAULT_SETTINGS, STORAGE_KEY } from '../../src/types';

const settings = ref<InspectorSettings>({ ...DEFAULT_SETTINGS });

const loadSettings = async () => {
  const saved = await ExtensionStorage.get<InspectorSettings>(STORAGE_KEY, DEFAULT_SETTINGS);
  if (saved) {
    settings.value = { ...DEFAULT_SETTINGS, ...saved };
  }
};

const saveSettings = async () => {
  await ExtensionStorage.set(STORAGE_KEY, settings.value);
};

const toggleEnabled = async () => {
  settings.value.enabled = !settings.value.enabled;
  await saveSettings();
};

const setCopyMode = async (mode: 'tailwind' | 'css') => {
  settings.value.copyMode = mode;
  await saveSettings();
};

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="popup-box">
    <!-- 头部 -->
    <header class="header">
      <div class="title-row">
        <div class="logo-wrap">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
          </svg>
        </div>
        <div class="title-meta">
          <h3 class="title">CSS & Tailwind 提取器</h3>
          <p class="subtitle">对标 $69 CSS Scan · 纯净免费</p>
        </div>
      </div>
      <span class="badge">PRO</span>
    </header>

    <!-- 主控卡片 -->
    <div class="control-card" :class="{ 'is-active': settings.enabled }">
      <div class="control-info">
        <span class="control-label">检查器状态</span>
        <span class="control-state">
          {{ settings.enabled ? '嗅探已激活 · 移动鼠标悬浮' : '已暂停嗅探' }}
        </span>
      </div>
      <button
        class="switch-btn"
        :class="{ 'switch-active': settings.enabled }"
        @click="toggleEnabled"
      >
        <span class="switch-handle" />
      </button>
    </div>

    <!-- 偏好模式切换 -->
    <div class="pref-card">
      <span class="pref-title">默认输出格式偏好</span>
      <div class="pref-segmented">
        <button
          class="seg-btn"
          :class="{ 'seg-active': settings.copyMode === 'tailwind' }"
          @click="setCopyMode('tailwind')"
        >
          Tailwind CSS
        </button>
        <button
          class="seg-btn"
          :class="{ 'seg-active': settings.copyMode === 'css' }"
          @click="setCopyMode('css')"
        >
          纯 CSS 属性
        </button>
      </div>
    </div>

    <!-- 快捷键指南 -->
    <div class="shortcuts-card">
      <div class="shortcut-row">
        <span class="shortcut-desc">锁定当前悬浮卡片</span>
        <kbd class="key-badge">Space</kbd>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-desc">退出检查模式</span>
        <kbd class="key-badge">Esc</kbd>
      </div>
    </div>

    <!-- 底部保障 -->
    <footer class="footer">
      <span>100-Free 开源生产力计划 · 无广告 · 零网络请求</span>
    </footer>
  </div>
</template>

<style scoped>
.popup-box {
  width: 320px;
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
  margin-bottom: 14px;
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
  background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
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
  background: #f0f9ff;
  color: #0284c7;
  border: 1px solid #bae6fd;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 主开关卡片 */
.control-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 10px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.control-card.is-active {
  background-color: #f0f9ff;
  border-color: #7dd3fc;
}

.control-info {
  display: flex;
  flex-direction: column;
}

.control-label {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
}

.control-state {
  font-size: 12px;
  font-weight: 600;
  color: #0369a1;
  margin-top: 1px;
}

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
  background-color: #0284c7;
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

/* 偏好卡片 */
.pref-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.pref-title {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.pref-segmented {
  display: flex;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 6px;
  gap: 2px;
}

.seg-btn {
  flex: 1;
  padding: 6px 0;
  font-size: 11px;
  font-weight: 600;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-active {
  background: #ffffff;
  color: #0284c7;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 快捷键卡片 */
.shortcuts-card {
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
  padding: 8px 12px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shortcut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shortcut-desc {
  font-size: 11px;
  color: #64748b;
}

.key-badge {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 10px;
  font-family: ui-monospace, monospace;
  color: #334155;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
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
