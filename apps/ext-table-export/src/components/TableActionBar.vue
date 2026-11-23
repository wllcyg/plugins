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
  (e: 'disable-feature'): void;
}>();

const copied = ref(false);
const showMenu = ref(false);

const handleCopy = () => {
  copied.value = true;
  emit('copy');
  setTimeout(() => {
    copied.value = false;
  }, 1600);
};

const handleDisable = () => {
  showMenu.value = false;
  emit('disable-feature');
};
</script>

<template>
  <div class="table-capsule">
    <!-- 表格规格标签 -->
    <div class="meta-tag">
      <svg class="icon-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </svg>
      <span class="meta-text">{{ rowCount }} 行 × {{ colCount }} 列</span>
    </div>

    <!-- 按钮动作组 -->
    <div class="btn-group">
      <button class="btn btn-excel" title="导出为标准 Excel (.xlsx)" @click="emit('export-excel')">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        <span>导出 Excel</span>
      </button>

      <button class="btn btn-secondary" title="导出为纯文本 CSV" @click="emit('export-csv')">
        <span>CSV</span>
      </button>

      <button :class="['btn', 'btn-secondary', { 'btn-copied': copied }]" title="复制数据，可直接在表格软件中粘贴" @click="handleCopy">
        <svg v-if="!copied" class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <svg v-else class="btn-icon success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{{ copied ? '已复制' : '复制' }}</span>
      </button>

      <!-- 更多设置与关闭菜单 -->
      <div class="menu-container">
        <button class="btn btn-icon-only" title="更多选项 / 关闭此功能" @click="showMenu = !showMenu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        <div v-if="showMenu" class="dropdown-menu">
          <button class="menu-item" @click="emit('close')">
            <span>仅暂时隐藏当前浮标</span>
          </button>
          <button class="menu-item menu-item-danger" @click="handleDisable">
            <span>关闭表格悬浮探测功能</span>
            <small class="menu-hint">关闭后可在插件栏重新开启</small>
          </button>
        </div>
      </div>

      <button class="btn btn-close" title="隐藏" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.table-capsule {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.94);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #f8fafc;
  padding: 5px 6px 5px 12px;
  border-radius: 9px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  line-height: 1;
  user-select: none;
  animation: slideInDown 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.meta-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  padding-right: 6px;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
}

.icon-grid {
  width: 14px;
  height: 14px;
  color: #38bdf8;
}

.meta-text {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.btn-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  line-height: 1;
  white-space: nowrap;
}

.btn-icon {
  width: 13px;
  height: 13px;
}

.btn-excel {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
}
.btn-excel:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.btn-copied {
  background: rgba(16, 185, 129, 0.2) !important;
  color: #34d399 !important;
}

.success-icon {
  color: #34d399;
}

.btn-icon-only {
  padding: 6px 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}
.btn-icon-only:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}
.btn-icon-only svg {
  width: 14px;
  height: 14px;
}

.menu-container {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  min-width: 190px;
  z-index: 100;
  animation: fadeIn 0.12s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  background: transparent;
  border: none;
  color: #e2e8f0;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
  width: 100%;
}
.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.menu-item-danger {
  color: #f87171;
}
.menu-item-danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.menu-hint {
  font-size: 10px;
  color: #94a3b8;
}

.btn-close {
  padding: 6px 6px;
  background: transparent;
  color: #64748b;
  border-radius: 6px;
}
.btn-close svg {
  width: 14px;
  height: 14px;
}
.btn-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
}
</style>
