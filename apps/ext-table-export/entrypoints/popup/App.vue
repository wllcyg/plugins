<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ExtensionStorage } from '@100free/core';
import { AppButton } from '@100free/ui';
import { t } from '../../src/utils/i18n';

interface TableMeta {
  index: number;
  title: string;
  rowCount: number;
  colCount: number;
}

const STORAGE_KEY_HOVER = 'table_hover_detector_enabled';

const hoverEnabled = ref(true);
const tables = ref<TableMeta[]>([]);
const loading = ref(true);

// 切换悬浮探测功能开关
const toggleHoverDetector = async () => {
  hoverEnabled.value = !hoverEnabled.value;
  await ExtensionStorage.set(STORAGE_KEY_HOVER, hoverEnabled.value);
  // 实时通知当前 tab 的 Content Script，无需等待 storage 事件延迟
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'SET_HOVER_ENABLED',
        enabled: hoverEnabled.value
      });
    }
  } catch {
    // tab 不支持 content script（如 chrome:// 页面）时静默忽略
  }
};

const scanTables = async () => {
  loading.value = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_TABLES' });
      if (response?.tables) {
        tables.value = response.tables;
      }
    }
  } catch {
    tables.value = [];
  } finally {
    loading.value = false;
  }
};

const handleExport = async (index: number, format: 'excel' | 'csv') => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'EXPORT_TABLE_BY_INDEX',
      index,
      format
    });
  }
};

onMounted(async () => {
  const enabled = await ExtensionStorage.get<boolean>(STORAGE_KEY_HOVER, true);
  hoverEnabled.value = enabled !== false;
  scanTables();
});
</script>

<template>
  <div class="popup-box">
    <header class="header">
      <div class="title-row">
        <span class="logo">📊</span>
        <h3 class="title">{{ t('extensionName') }}</h3>
      </div>
      <span class="badge">100-Free</span>
    </header>

    <!-- 功能启停主控卡片 -->
    <div class="setting-card">
      <div class="setting-info">
        <span class="setting-label">{{ t('hoverDetectorLabel') }}</span>
        <span class="setting-desc">
          {{ hoverEnabled ? t('hoverDetectorActive') : t('hoverDetectorInactive') }}
        </span>
      </div>
      <button
        :class="['switch-btn', { 'switch-active': hoverEnabled }]"
        :title="t('hoverDetectorLabel')"
        @click="toggleHoverDetector"
      >
        <span class="switch-handle" />
      </button>
    </div>

    <main class="content">
      <div v-if="loading" class="empty-state">
        {{ t('scanningTables') }}
      </div>

      <div v-else-if="tables.length === 0" class="empty-state">
        <p>{{ t('noTablesFound') }}</p>
        <span class="tip">{{ t('refreshTip') }}</span>
      </div>

      <div v-else class="table-list">
        <div class="list-summary">
          {{ t('foundTables', [String(tables.length)]) }}
        </div>
        <div v-for="tItem in tables" :key="tItem.index" class="table-item">
          <div class="table-info">
            <span class="name" :title="tItem.title">{{ tItem.title }}</span>
            <span class="meta">{{ t('rowsCols', [String(tItem.rowCount), String(tItem.colCount)]) }}</span>
          </div>
          <div class="table-actions">
            <AppButton size="sm" variant="primary" @click="handleExport(tItem.index, 'excel')">
              Excel
            </AppButton>
            <AppButton size="sm" variant="secondary" @click="handleExport(tItem.index, 'csv')">
              CSV
            </AppButton>
          </div>
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
  width: 320px;
  max-height: 520px;
  padding: 16px;
  box-sizing: border-box;
  background-color: #ffffff;
  color: #1e293b;
  display: flex;
  flex-direction: column;
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

.logo {
  font-size: 18px;
}

.title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.badge {
  background-color: #10b981;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 核心设置开关卡片 */
.setting-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 12px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.setting-desc {
  font-size: 11px;
  color: #64748b;
}

/* 现代高颜值 Switch 控件 */
.switch-btn {
  width: 38px;
  height: 22px;
  background-color: #cbd5e1;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 2px;
  outline: none;
  flex-shrink: 0;
}

.switch-active {
  background-color: #10b981;
}

.switch-handle {
  display: block;
  width: 18px;
  height: 18px;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.switch-active .switch-handle {
  transform: translateX(16px);
}

.content {
  padding: 14px 0;
  overflow-y: auto;
  max-height: 320px;
}

.empty-state {
  text-align: center;
  padding: 20px 10px;
  color: #64748b;
  font-size: 13px;
}

.tip {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 8px;
}

.list-summary {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}

.table-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background-color: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.table-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.meta {
  font-size: 11px;
  color: #64748b;
}

.table-actions {
  display: flex;
  gap: 6px;
}

.footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
}
</style>


