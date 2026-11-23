<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  rowCount: number;
  colCount: number;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'export-excel'): void;
  (e: 'export-csv'): void;
  (e: 'copy'): void;
  (e: 'close'): void;
}>();

const copied = ref(false);

const handleCopy = () => {
  copied.value = true;
  emit('copy');
  setTimeout(() => {
    copied.value = false;
  }, 1500);
};
</script>

<template>
  <div class="table-action-bar">
    <div class="info-tag">
      <span class="icon">📊</span>
      <span class="text">{{ rowCount }} 行 × {{ colCount }} 列</span>
    </div>

    <div class="actions">
      <button class="btn btn-primary" title="导出为标准 Excel 文件 (.xlsx)" @click="emit('export-excel')">
        导出 Excel
      </button>
      <button class="btn btn-secondary" title="导出为 CSV 文本" @click="emit('export-csv')">
        CSV
      </button>
      <button class="btn btn-secondary" title="复制到剪贴板，可直接在 Excel 中粘贴" @click="handleCopy">
        {{ copied ? '已复制！' : '复制' }}
      </button>
      <button class="btn btn-close" title="隐藏" @click="emit('close')">
        ✕
      </button>
    </div>
  </div>
</template>

<style scoped>
.table-action-bar {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background-color: #1e293b;
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
  user-select: none;
  animation: fadeIn 0.15s ease-out;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.info-tag {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  color: #cbd5e1;
  padding-right: 6px;
  border-right: 1px solid #334155;
}

.actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1.2;
}

.btn-primary {
  background-color: #10b981;
  color: #ffffff;
}
.btn-primary:hover {
  background-color: #059669;
}

.btn-secondary {
  background-color: #334155;
  color: #f1f5f9;
}
.btn-secondary:hover {
  background-color: #475569;
}

.btn-close {
  background: transparent;
  color: #94a3b8;
  padding: 4px 6px;
}
.btn-close:hover {
  color: #ffffff;
  background-color: #334155;
}
</style>

