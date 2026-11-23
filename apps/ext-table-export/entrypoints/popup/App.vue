<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { AppButton } from '@100free/ui';

interface TableMeta {
  index: number;
  title: string;
  rowCount: number;
  colCount: number;
}

const tables = ref<TableMeta[]>([]);
const loading = ref(true);

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
    // 页面可能未加载或无权限注入
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

onMounted(() => {
  scanTables();
});
</script>

<template>
  <div class="popup-box">
    <header class="header">
      <div class="title-row">
        <span class="logo">📊</span>
        <h3 class="title">网页表格一键导出</h3>
      </div>
      <span class="badge">100-Free</span>
    </header>

    <main class="content">
      <div v-if="loading" class="empty-state">
        正在扫描当前页面表格...
      </div>

      <div v-else-if="tables.length === 0" class="empty-state">
        <p>当前页面未探测到标准表格</p>
        <span class="tip">提示：鼠标直接悬停在表格上也会自动出现导出浮标。</span>
      </div>

      <div v-else class="table-list">
        <div class="list-summary">
          共发现 <b>{{ tables.length }}</b> 个表格：
        </div>
        <div v-for="t in tables" :key="t.index" class="table-item">
          <div class="table-info">
            <span class="name">{{ t.title }}</span>
            <span class="meta">{{ t.rowCount }} 行 × {{ t.colCount }} 列</span>
          </div>
          <div class="table-actions">
            <AppButton size="sm" variant="primary" @click="handleExport(t.index, 'excel')">
              Excel
            </AppButton>
            <AppButton size="sm" variant="secondary" @click="handleExport(t.index, 'csv')">
              CSV
            </AppButton>
          </div>
        </div>
      </div>
    </main>

    <footer class="footer">
      <span>打破昂贵订阅 · 让生产力重归自由</span>
    </footer>
  </div>
</template>

<style scoped>
.popup-box {
  width: 320px;
  max-height: 480px;
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

.content {
  padding: 14px 0;
  overflow-y: auto;
  max-height: 340px;
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

