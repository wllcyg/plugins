<script setup lang="ts">
import { ref } from 'vue';
import { Camera, Scissors, Monitor, CheckCircle } from 'lucide-vue-next';
import { t } from '../../src/utils/i18n';

const isCapturing = ref(false);

const captureFullPage = async () => {
  isCapturing.value = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'START_FULL_PAGE_CAPTURE' });
      window.close(); // 关闭 popup 让页面平稳滚动
    }
  } finally {
    isCapturing.value = false;
  }
};

const captureVisible = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_VISIBLE_ONLY' });
    window.close();
  }
};
</script>

<template>
  <div class="popup-box">
    <header class="header">
      <div class="title-row">
        <div class="logo-wrap">
          <Camera class="w-4 h-4 text-white" />
        </div>
        <h3 class="title">{{ t('extensionName') }}</h3>
      </div>
      <span class="badge">100-Free</span>
    </header>

    <main class="content">
      <!-- 核心动作卡片 -->
      <button class="action-card primary-card" @click="captureFullPage">
        <div class="card-left">
          <div class="icon-wrap primary-icon">
            <Camera class="w-5 h-5 text-emerald-600" />
          </div>
          <div class="text-wrap">
            <span class="card-title">{{ t('captureFullPage') }}</span>
            <span class="card-desc">自动平滑滚屏，防吸顶重复，截取完整网页</span>
          </div>
        </div>
        <span class="action-tag">最常用</span>
      </button>

      <button class="action-card" @click="captureVisible">
        <div class="card-left">
          <div class="icon-wrap">
            <Monitor class="w-5 h-5 text-slate-600" />
          </div>
          <div class="text-wrap">
            <span class="card-title">{{ t('captureVisible') }}</span>
            <span class="card-desc">仅快速保存当前屏幕可视区域内容</span>
          </div>
        </div>
      </button>

      <!-- 特性承诺 -->
      <div class="feature-bar">
        <div class="feat-item">
          <CheckCircle class="w-3.5 h-3.5 text-emerald-500" />
          <span>本地 Canvas 渲染</span>
        </div>
        <div class="feat-item">
          <CheckCircle class="w-3.5 h-3.5 text-emerald-500" />
          <span>零隐私数据上传</span>
        </div>
      </div>
    </main>

    <footer class="footer">
      <span>{{ t('footerSlogan') }}</span>
    </footer>
  </div>
</template>

<style scoped>
.popup-box {
  width: 300px;
  padding: 16px;
  box-sizing: border-box;
  background-color: #ffffff;
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  user-select: none;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 12px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-wrap {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.badge {
  background-color: #0284c7;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.content {
  padding: 14px 0 6px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.action-card:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.primary-card {
  background: linear-gradient(to right, #f0fdf4, #ffffff);
  border-color: #bbf7d0;
}

.primary-card:hover {
  border-color: #86efac;
  background: #f0fdf4;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-icon {
  background-color: #dcfce7;
}

.text-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.card-desc {
  font-size: 11px;
  color: #64748b;
  max-width: 175px;
  line-height: 1.3;
}

.action-tag {
  font-size: 10px;
  font-weight: 600;
  color: #15803d;
  background-color: #dcfce7;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.feature-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-top: 4px;
  padding: 8px;
  background-color: #f8fafc;
  border-radius: 8px;
  font-size: 11px;
  color: #64748b;
}

.feat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
}
</style>
