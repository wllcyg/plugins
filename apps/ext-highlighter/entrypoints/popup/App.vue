<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { HIGHLIGHT_COLORS, HighlightColorId, HighlightItem, HighlightStyle } from '../../src/types';
import {
  deleteHighlightById,
  exportHighlightsToMarkdown,
  getPageHighlights,
  getSettings,
  saveSettings,
  triggerTextDownload,
  upsertHighlight
} from '../../src/core/storage';

const pageItems = ref<HighlightItem[]>([]);
const allCount = ref(0);
const currentTabId = ref<number | undefined>();
const pageTitle = ref('当前网页');
const toolbarEnabled = ref(true);
const defaultColor = ref<HighlightColorId>('yellow');
const defaultStyle = ref<HighlightStyle>('fill');
const filterColor = ref<HighlightColorId | 'all'>('all');
const editingId = ref<string | null>(null);
const editingNote = ref('');
const toastMsg = ref('');

const showToast = (msg: string) => {
  toastMsg.value = msg;
  setTimeout(() => {
    if (toastMsg.value === msg) toastMsg.value = '';
  }, 2000);
};

const filteredItems = computed(() => {
  if (filterColor.value === 'all') return pageItems.value;
  return pageItems.value.filter((x) => x.color === filterColor.value);
});

const getColorDot = (id: HighlightColorId) => {
  return HIGHLIGHT_COLORS.find((c) => c.id === id)?.dot || '#facc15';
};

const syncSettingsToTab = async () => {
  const next = await saveSettings({
    toolbarEnabled: toolbarEnabled.value,
    defaultColor: defaultColor.value,
    defaultStyle: defaultStyle.value
  });
  if (currentTabId.value) {
    chrome.tabs.sendMessage(currentTabId.value, { action: 'UPDATE_SETTINGS', settings: next }).catch(() => {});
  }
};

const toggleToolbar = async () => {
  toolbarEnabled.value = !toolbarEnabled.value;
  await syncSettingsToTab();
  showToast(toolbarEnabled.value ? '已开启划词浮条' : '已暂停划词浮条（仍可右键高亮）');
};

const setDefaultBrush = async (color: HighlightColorId) => {
  defaultColor.value = color;
  await syncSettingsToTab();
  showToast('已更新默认荧光色');
};

const toggleDefaultStyle = async () => {
  defaultStyle.value = defaultStyle.value === 'fill' ? 'underline' : 'fill';
  await syncSettingsToTab();
  showToast(defaultStyle.value === 'fill' ? '默认模式：荧光填充' : '默认模式：下划线');
};

const locateInPage = (id: string) => {
  if (!currentTabId.value) return;
  chrome.tabs.sendMessage(currentTabId.value, { action: 'SCROLL_TO_HIGHLIGHT', id }).catch(() => {});
};

const changeItemColor = async (item: HighlightItem, color: HighlightColorId) => {
  item.color = color;
  item.updatedAt = Date.now();
  await upsertHighlight(item);
  if (currentTabId.value) {
    chrome.tabs.sendMessage(currentTabId.value, {
      action: 'UPDATE_HIGHLIGHT',
      item: JSON.parse(JSON.stringify(item))
    }).catch(() => {});
  }
};

const startEditNote = (item: HighlightItem) => {
  editingId.value = item.id;
  editingNote.value = item.note || '';
};

const saveNote = async (item: HighlightItem) => {
  item.note = editingNote.value.trim();
  item.updatedAt = Date.now();
  await upsertHighlight(item);
  editingId.value = null;
  if (currentTabId.value) {
    chrome.tabs.sendMessage(currentTabId.value, {
      action: 'UPDATE_HIGHLIGHT',
      item: JSON.parse(JSON.stringify(item))
    }).catch(() => {});
  }
  showToast('批注已保存');
};

const removeItem = async (id: string) => {
  await deleteHighlightById(id);
  pageItems.value = pageItems.value.filter((x) => x.id !== id);
  if (currentTabId.value) {
    chrome.tabs.sendMessage(currentTabId.value, { action: 'REMOVE_HIGHLIGHT', id }).catch(() => {});
  }
  showToast('已移除高亮');
};

const copyPageMarkdown = async () => {
  if (pageItems.value.length === 0) return;
  const md = exportHighlightsToMarkdown(pageItems.value, pageTitle.value);
  await navigator.clipboard.writeText(md);
  showToast('已复制本页 Markdown 笔记');
};

const downloadPageMarkdown = () => {
  if (pageItems.value.length === 0) return;
  const md = exportHighlightsToMarkdown(pageItems.value, pageTitle.value);
  const safeName = pageTitle.value.replace(/[\\/:*?"<>|]/g, '_').slice(0, 32) || 'notes';
  triggerTextDownload(md, `${safeName}.md`);
  showToast('正在导出 Markdown 文件...');
};

const openNotebook = async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL('notebook.html') });
};

onMounted(async () => {
  const settings = await getSettings();
  toolbarEnabled.value = settings.toolbarEnabled;
  defaultColor.value = settings.defaultColor;
  defaultStyle.value = settings.defaultStyle;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      currentTabId.value = tab.id;
      pageTitle.value = tab.title || '当前网页';
      pageItems.value = await getPageHighlights(tab.url);
    }
    const all = await chrome.storage.local.get('hl_items_v1');
    allCount.value = Array.isArray(all?.hl_items_v1) ? all.hl_items_v1.length : 0;
  } catch {
    // ignore
  }
});
</script>

<template>
  <div class="hl-popup">
    <header class="header">
      <div class="brand">
        <div class="brand-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 11-6 6v3h9l3-3" />
            <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
          </svg>
        </div>
        <div>
          <h1 class="brand-title">网页荧光笔</h1>
          <p class="brand-sub">本地离线 · 无限多色 · 零登录</p>
        </div>
      </div>

      <div class="header-actions">
        <button
          class="switch-pill"
          :class="{ active: toolbarEnabled }"
          title="开启或暂停划词自动弹出荧光笔工具条"
          @click="toggleToolbar"
        >
          <span class="status-dot" />
          <span>{{ toolbarEnabled ? '划词开启' : '已暂停' }}</span>
        </button>
        <button class="notebook-btn" @click="openNotebook">
          <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          <span>笔记本 ({{ allCount }})</span>
        </button>
      </div>
    </header>

    <!-- 默认画笔预设条 -->
    <div class="brush-bar">
      <div class="brush-left">
        <span class="brush-label">默认画笔</span>
        <div class="brush-dots">
          <button
            v-for="c in HIGHLIGHT_COLORS"
            :key="c.id"
            class="brush-dot"
            :class="{ active: defaultColor === c.id }"
            :style="{ backgroundColor: c.dot }"
            :title="`默认使用${c.name}`"
            @click="setDefaultBrush(c.id)"
          />
        </div>
      </div>
      <button class="style-mode-btn" :class="{ active: defaultStyle === 'underline' }" @click="toggleDefaultStyle">
        <svg v-if="defaultStyle === 'underline'" width="12.5" height="12.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" y1="20" x2="20" y2="20" />
        </svg>
        <svg v-else width="12.5" height="12.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 11-6 6v3h9l3-3" /><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
        </svg>
        <span>{{ defaultStyle === 'underline' ? '下划线' : '荧光填充' }}</span>
      </button>
    </div>

    <!-- 本页状态与颜色筛选 -->
    <div class="subbar">
      <div class="page-info" :title="pageTitle">
        本页已标 <strong>{{ pageItems.length }}</strong> 条重点
      </div>
      <div class="color-filters">
        <button class="filter-all" :class="{ active: filterColor === 'all' }" @click="filterColor = 'all'">
          全部
        </button>
        <button
          v-for="c in HIGHLIGHT_COLORS"
          :key="c.id"
          class="color-chip"
          :class="{ active: filterColor === c.id }"
          :style="{ backgroundColor: c.dot }"
          :title="c.name"
          @click="filterColor = c.id"
        />
      </div>
    </div>

    <!-- 列表区 -->
    <main class="list-wrap">
      <div v-if="filteredItems.length === 0" class="empty-box">
        <div class="empty-illus">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 11-6 6v3h9l3-3" />
            <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
          </svg>
        </div>
        <p class="empty-title">当前页面暂无高亮记录</p>
        <p class="empty-hint">在网页正文任意划选文字，即可浮现 6 色荧光笔与随手批注工具条</p>
      </div>

      <div v-else class="items-list">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="hl-card"
          :style="{ borderLeftColor: getColorDot(item.color) }"
        >
          <p class="hl-quote" title="点击滚动定位到网页原句" @click="locateInPage(item.id)">
            {{ item.text }}
          </p>

          <div v-if="editingId === item.id" class="note-editor">
            <textarea
              v-model="editingNote"
              rows="2"
              class="note-input"
              placeholder="输入批注想法..."
            />
            <div class="editor-btns">
              <button class="btn-cancel" @click="editingId = null">取消</button>
              <button class="btn-save" @click="saveNote(item)">保存</button>
            </div>
          </div>

          <div v-else-if="item.note" class="hl-note" @click="startEditNote(item)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span>{{ item.note }}</span>
          </div>

          <div class="card-foot">
            <div class="mini-colors">
              <button
                v-for="c in HIGHLIGHT_COLORS"
                :key="c.id"
                class="mini-dot"
                :class="{ current: item.color === c.id }"
                :style="{ backgroundColor: c.dot }"
                @click="changeItemColor(item, c.id)"
              />
            </div>
            <div class="card-acts">
              <button class="act-btn" @click="startEditNote(item)">{{ item.note ? '改批注' : '+ 批注' }}</button>
              <button class="act-btn" @click="locateInPage(item.id)">定位</button>
              <button class="act-btn act-del" @click="removeItem(item.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 底部导出栏 -->
    <footer class="footer">
      <button class="foot-btn" :disabled="pageItems.length === 0" @click="copyPageMarkdown">
        <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
        <span>复制 Markdown</span>
      </button>
      <button class="foot-btn primary" :disabled="pageItems.length === 0" @click="downloadPageMarkdown">
        <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
        </svg>
        <span>导出 .md 笔记</span>
      </button>
    </footer>

    <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
  </div>
</template>

<style scoped>
.hl-popup {
  width: 420px;
  min-height: 490px;
  max-height: 590px;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  color: #f8fafc;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #131c31;
  border-bottom: 1px solid #24324b;
}
.brand { display: flex; align-items: center; gap: 9px; }
.brand-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, #facc15 0%, #f59e0b 100%);
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-title { margin: 0; font-size: 14px; font-weight: 750; }
.brand-sub { margin: 0; font-size: 10.5px; color: #94a3b8; }
.header-actions { display: flex; align-items: center; gap: 6px; }
.switch-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.switch-pill.active { color: #34d399; border-color: rgba(16, 185, 129, 0.4); }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.notebook-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #2563eb;
  border: none;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 650;
  padding: 6px 10px;
  border-radius: 7px;
  cursor: pointer;
}
.notebook-btn:hover { background: #1d4ed8; }

.brush-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 14px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
}
.brush-left { display: flex; align-items: center; gap: 8px; }
.brush-label { font-size: 11px; color: #64748b; font-weight: 600; }
.brush-dots { display: flex; align-items: center; gap: 6px; }
.brush-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
  transition: transform 0.14s ease, border-color 0.14s ease;
}
.brush-dot:hover { transform: scale(1.18); }
.brush-dot.active { border-color: #ffffff; transform: scale(1.2); }
.style-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.style-mode-btn.active { border-color: #3b82f6; color: #93c5fd; }

.subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 14px;
  background: #0b1120;
  border-bottom: 1px solid #1e293b;
}
.page-info { font-size: 12px; color: #94a3b8; }
.page-info strong { color: #facc15; }
.color-filters { display: flex; align-items: center; gap: 6px; }
.filter-all {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 5px;
  cursor: pointer;
}
.filter-all.active { background: #334155; color: #ffffff; }
.color-chip {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}
.color-chip.active { border-color: #ffffff; transform: scale(1.18); }

.list-wrap { flex: 1; overflow-y: auto; padding: 10px 14px; }
.empty-box {
  text-align: center;
  padding: 46px 20px;
  color: #94a3b8;
}
.empty-illus {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border-radius: 16px;
  background: #131c31;
  border: 1px solid #24324b;
  color: #facc15;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-title { margin: 0 0 6px; font-size: 13.5px; font-weight: 650; color: #e2e8f0; }
.empty-hint { margin: 0; font-size: 12px; color: #64748b; line-height: 1.55; }

.items-list { display: flex; flex-direction: column; gap: 8px; }
.hl-card {
  background: #131c31;
  border: 1px solid #24324b;
  border-left-width: 4px;
  border-radius: 9px;
  padding: 10px;
  transition: border-color 0.15s ease;
}
.hl-card:hover { border-color: #334155; }
.hl-quote {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: #f1f5f9;
  cursor: pointer;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hl-quote:hover { color: #fde047; }
.hl-note {
  margin-top: 7px;
  padding: 6px 8px;
  background: #0b1120;
  border-radius: 6px;
  font-size: 12px;
  color: #cbd5e1;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.hl-note svg { flex-shrink: 0; margin-top: 2px; color: #38bdf8; }
.note-editor { margin-top: 8px; }
.note-input {
  width: 100%;
  background: #0b1120;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #f8fafc;
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
}
.editor-btns { display: flex; justify-content: flex-end; gap: 6px; margin-top: 5px; }
.btn-cancel, .btn-save {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
}
.btn-cancel { background: #334155; color: #cbd5e1; }
.btn-save { background: #2563eb; color: #ffffff; }

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 7px;
  border-top: 1px solid rgba(51, 65, 85, 0.45);
}
.mini-colors { display: flex; gap: 4px; }
.mini-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1px solid transparent;
  padding: 0;
  cursor: pointer;
  opacity: 0.65;
}
.mini-dot.current, .mini-dot:hover { opacity: 1; border-color: #ffffff; }
.card-acts { display: flex; gap: 10px; }
.act-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}
.act-btn:hover { color: #38bdf8; }
.act-del:hover { color: #f87171; }

.footer {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  background: #131c31;
  border-top: 1px solid #24324b;
}
.foot-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.foot-btn:hover:not(:disabled) { border-color: #475569; }
.foot-btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}
.foot-btn.primary:hover:not(:disabled) { background: #1d4ed8; }
.foot-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.toast {
  position: fixed;
  bottom: 58px;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}
</style>
