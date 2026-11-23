<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  rowCount: number;
  colCount: number;
  isVirtualScroll?: boolean;
  virtualHint?: string;
  hostname?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isVirtualScroll: false,
  virtualHint: '',
  hostname: ''
});

const emit = defineEmits<{
  (e: 'export-excel'): void;
  (e: 'export-csv'): void;
  (e: 'copy'): void;
  (e: 'close'): void;
  (e: 'disable-feature'): void;
  (e: 'disable-host'): void;
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

const handleDisableHost = () => {
  showMenu.value = false;
  emit('disable-host');
};

const handleClose = () => {
  showMenu.value = false;
  emit('close');
};
</script>

<template>
  <div class="table-capsule-wrapper">
    <!-- 虚拟滚动警告条 -->
    <div v-if="isVirtualScroll" class="virtual-warning-banner" :title="virtualHint">
      <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>虚拟滚动：当前仅捕获屏幕已挂载的可视行</span>
    </div>

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
        <button class="btn btn-excel" title="导出为标准 Excel (.xlsx，已防大数截断)" @click="emit('export-excel')">
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
          <button class="btn btn-icon-only" title="更多选项 / 关闭此功能" @click.stop.prevent="showMenu = !showMenu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          <div v-if="showMenu" class="dropdown-menu">
            <button class="menu-item" @click.stop.prevent="handleClose">
              <span>仅暂时隐藏当前浮标</span>
              <small class="menu-hint">20秒内鼠标在此表格上绝不再弹出</small>
            </button>
            <button v-if="hostname" class="menu-item" @click.stop.prevent="handleDisableHost">
              <span>在此网站 ({{ hostname }}) 永久禁用</span>
              <small class="menu-hint">不影响其他网站，可在插件面板管理</small>
            </button>
            <button class="menu-item menu-item-danger" @click.stop.prevent="handleDisable">
              <span>关闭表格悬浮探测功能</span>
              <small class="menu-hint">关闭后可在插件栏重新开启</small>
            </button>
          </div>
        </div>

        <button class="btn btn-close" title="隐藏" @click.stop.prevent="handleClose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-capsule-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.virtual-warning-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.06);
}

.warning-icon {
  width: 13px;
  height: 13px;
  color: #d97706;
  shrink: 0;
}

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

.btn-excel {
  background-color: #10b981;
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-excel:hover {
  background-color: #059669;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.btn-copied {
  background-color: rgba(16, 185, 129, 0.25) !important;
  color: #34d399 !important;
}

.btn-icon-only {
  background: transparent;
  color: #94a3b8;
  padding: 6px;
  border-radius: 5px;
}

.btn-icon-only:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

.btn-close {
  background: transparent;
  color: #94a3b8;
  padding: 6px;
  border-radius: 5px;
  margin-left: -2px;
}

.btn-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.btn-icon {
  width: 13px;
  height: 13px;
}

.btn-icon-only svg,
.btn-close svg {
  width: 14px;
  height: 14px;
}

.success-icon {
  color: #34d399;
}

/* 下拉菜单 */
.menu-container {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background-color: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  padding: 4px;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.menu-item {
  background: transparent;
  border: none;
  color: #f1f5f9;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: background-color 0.15s;
}

.menu-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.menu-hint {
  font-size: 10px;
  color: #94a3b8;
}

.menu-item-danger:hover {
  background-color: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}
</style>
