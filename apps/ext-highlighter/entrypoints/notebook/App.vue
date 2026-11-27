<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { HIGHLIGHT_COLORS, HighlightColorId, HighlightItem } from '../../src/types';
import {
  deleteHighlightById,
  exportHighlightsToMarkdown,
  getAllHighlights,
  saveAllHighlights,
  triggerTextDownload,
  upsertHighlight
} from '../../src/core/storage';
import { m } from '../../src/locales';

const allItems = ref<HighlightItem[]>([]);
const searchQuery = ref('');
const selectedDomain = ref<string>('all');
const selectedColor = ref<HighlightColorId | 'all'>('all');
const onlyWithNotes = ref(false);
const viewMode = ref<'grouped' | 'cards'>('grouped');

const editingId = ref<string | null>(null);
const editingNote = ref('');
const newTagInput = ref('');
const toastMsg = ref('');

const showToast = (msg: string) => {
  toastMsg.value = msg;
  setTimeout(() => {
    if (toastMsg.value === msg) toastMsg.value = '';
  }, 2200);
};

const domainStats = computed(() => {
  const map = new Map<string, number>();
  for (const item of allItems.value) {
    const d = item.domain || m.localPage;
    map.set(d, (map.get(d) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
});

const totalPagesCount = computed(() => {
  return new Set(allItems.value.map((x) => x.url)).size;
});

const totalNotesCount = computed(() => {
  return allItems.value.filter((x) => Boolean(x.note?.trim())).length;
});

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return allItems.value.filter((item) => {
    if (selectedDomain.value !== 'all' && (item.domain || m.localPage) !== selectedDomain.value) return false;
    if (selectedColor.value !== 'all' && item.color !== selectedColor.value) return false;
    if (onlyWithNotes.value && !item.note?.trim()) return false;
    if (!q) return true;
    return (
      item.text.toLowerCase().includes(q) ||
      (item.note || '').toLowerCase().includes(q) ||
      (item.pageTitle || '').toLowerCase().includes(q) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });
});

// 按网页文章聚合的分组视图
const groupedByPage = computed(() => {
  const map = new Map<string, { url: string; pageTitle: string; domain: string; latestAt: number; items: HighlightItem[] }>();
  for (const item of filteredItems.value) {
    const existing = map.get(item.url);
    if (existing) {
      existing.items.push(item);
      if (item.createdAt > existing.latestAt) existing.latestAt = item.createdAt;
    } else {
      map.set(item.url, {
        url: item.url,
        pageTitle: item.pageTitle || item.domain || item.url,
        domain: item.domain || m.localPage,
        latestAt: item.createdAt,
        items: [item]
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.latestAt - a.latestAt);
});

const getColorPreset = (id: HighlightColorId) => {
  return HIGHLIGHT_COLORS.find((c) => c.id === id) || HIGHLIGHT_COLORS[0];
};

const openSourceAtHighlight = (item: HighlightItem) => {
  const targetUrl = `${item.url}#100free-hl=${encodeURIComponent(item.id)}`;
  chrome.tabs.create({ url: targetUrl });
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
  showToast(m.toastNoteUpdated);
};

const addTag = async (item: HighlightItem) => {
  const tag = newTagInput.value.trim().replace(/^#/, '');
  if (!tag) return;
  if (!item.tags) item.tags = [];
  if (!item.tags.includes(tag)) {
    item.tags.push(tag);
    item.updatedAt = Date.now();
    await upsertHighlight(item);
  }
  newTagInput.value = '';
};

const removeTag = async (item: HighlightItem, tag: string) => {
  item.tags = (item.tags || []).filter((t) => t !== tag);
  item.updatedAt = Date.now();
  await upsertHighlight(item);
};

const deleteItem = async (id: string) => {
  allItems.value = await deleteHighlightById(id);
  showToast(m.toastNoteDeleted);
};

const exportMarkdown = (items = filteredItems.value, title = m.defaultNotebookTitle) => {
  if (items.length === 0) return;
  const md = exportHighlightsToMarkdown(items, title);
  const safeName = title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 32) || 'notebook';
  triggerTextDownload(md, `${safeName}-${new Date().toISOString().slice(0, 10)}.md`);
  showToast(m.toastExportedMdCount(items.length));
};

const copyMarkdown = async (items: HighlightItem[], title: string) => {
  const md = exportHighlightsToMarkdown(items, title);
  await navigator.clipboard.writeText(md);
  showToast(m.toastCopiedMd);
};

const exportJsonBackup = () => {
  const json = JSON.stringify(allItems.value, null, 2);
  triggerTextDownload(json, `100free-highlights-backup-${Date.now()}.json`, 'application/json');
  showToast(m.toastExportedJson);
};

const importJsonBackup = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const parsed = JSON.parse(ev.target?.result as string);
      if (!Array.isArray(parsed)) throw new Error('Invalid format');
      const map = new Map<string, HighlightItem>();
      allItems.value.forEach((x) => map.set(x.id, x));
      parsed.forEach((x: HighlightItem) => {
        if (x?.id && x?.text && x?.url) map.set(x.id, x);
      });
      const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      await saveAllHighlights(merged);
      allItems.value = merged;
      showToast(m.toastImportedJson(merged.length));
    } catch {
      showToast(m.toastInvalidJson);
    }
  };
  reader.readAsText(file);
};

onMounted(async () => {
  document.title = m.notebookDocTitle;
  allItems.value = await getAllHighlights();
});
</script>

<template>
  <div class="notebook-shell">
    <!-- 左侧边栏 -->
    <aside class="sidebar">
      <div class="sb-brand">
        <div class="sb-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 11-6 6v3h9l3-3" />
            <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
          </svg>
        </div>
        <div>
          <h1 class="sb-title">{{ m.notebookTitle }}</h1>
          <span class="sb-sub">{{ m.notebookSub }}</span>
        </div>
      </div>

      <!-- 轻量统计 -->
      <div class="stats-grid">
        <div class="stat-box">
          <strong>{{ totalPagesCount }}</strong>
          <span>{{ m.statPages }}</span>
        </div>
        <div class="stat-box">
          <strong>{{ allItems.length }}</strong>
          <span>{{ m.statHighlights }}</span>
        </div>
        <div class="stat-box">
          <strong>{{ totalNotesCount }}</strong>
          <span>{{ m.statNotes }}</span>
        </div>
      </div>

      <div class="sb-section">
        <button
          class="sb-nav-btn"
          :class="{ active: selectedDomain === 'all' && !onlyWithNotes }"
          @click="selectedDomain = 'all'; onlyWithNotes = false"
        >
          <span class="nav-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            {{ m.navAll }}
          </span>
          <span class="count-badge">{{ allItems.length }}</span>
        </button>
        <button
          class="sb-nav-btn"
          :class="{ active: onlyWithNotes }"
          @click="onlyWithNotes = !onlyWithNotes"
        >
          <span class="nav-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            {{ m.navOnlyNotes }}
          </span>
          <span class="count-badge">{{ totalNotesCount }}</span>
        </button>
      </div>

      <div class="sb-section">
        <div class="sb-label">{{ m.filterByColor }}</div>
        <div class="sb-colors">
          <button
            class="color-pill"
            :class="{ active: selectedColor === 'all' }"
            @click="selectedColor = 'all'"
          >
            {{ m.allColors }}
          </button>
          <button
            v-for="c in HIGHLIGHT_COLORS"
            :key="c.id"
            class="color-dot"
            :class="{ active: selectedColor === c.id }"
            :style="{ backgroundColor: c.dot }"
            :title="m.colorNames[c.id]"
            @click="selectedColor = c.id"
          />
        </div>
      </div>

      <div class="sb-section sb-domains">
        <div class="sb-label">{{ m.filterByDomain(domainStats.length) }}</div>
        <div class="domain-list">
          <button
            v-for="[domain, cnt] in domainStats"
            :key="domain"
            class="sb-nav-btn"
            :class="{ active: selectedDomain === domain }"
            @click="selectedDomain = selectedDomain === domain ? 'all' : domain"
          >
            <span class="domain-name" :title="domain">{{ domain }}</span>
            <span class="count-badge">{{ cnt }}</span>
          </button>
        </div>
      </div>

      <div class="sb-footer">
        <button class="backup-btn" @click="exportJsonBackup">{{ m.exportBackup }}</button>
        <label class="backup-btn">
          {{ m.importBackup }}
          <input type="file" accept=".json" hidden @change="importJsonBackup" />
        </label>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-area">
      <header class="topbar">
        <div class="search-wrap">
          <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            class="search-input"
            :placeholder="m.searchPlaceholder"
          />
        </div>

        <div class="topbar-actions">
          <div class="view-switcher" role="group" :aria-label="m.viewSwitchLabel">
            <button
              class="view-btn"
              :class="{ active: viewMode === 'grouped' }"
              :title="m.viewGroupedTitle"
              @click="viewMode = 'grouped'"
            >
              {{ m.viewGrouped }}
            </button>
            <button
              class="view-btn"
              :class="{ active: viewMode === 'cards' }"
              :title="m.viewCardsTitle"
              @click="viewMode = 'cards'"
            >
              {{ m.viewCards }}
            </button>
          </div>

          <button
            class="export-md-btn"
            :disabled="filteredItems.length === 0"
            @click="exportMarkdown(filteredItems, m.defaultNotebookTitle)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            <span>{{ m.exportMdCount(filteredItems.length) }}</span>
          </button>
        </div>
      </header>

      <section class="cards-viewport">
        <div v-if="filteredItems.length === 0" class="empty-state">
          <div class="empty-icon-box">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
          <p class="empty-h">{{ m.emptyNotebookTitle }}</p>
          <p class="empty-p">{{ m.emptyNotebookHint }}</p>
        </div>

        <!-- 视图 1：按文章聚合展示（默认，整洁有条理） -->
        <div v-else-if="viewMode === 'grouped'" class="grouped-list">
          <article v-for="group in groupedByPage" :key="group.url" class="article-card">
            <div class="article-head">
              <div class="article-meta">
                <a :href="group.url" target="_blank" rel="noreferrer" class="article-title">
                  {{ group.pageTitle }}
                </a>
                <span class="article-sub">{{ m.groupMeta(group.domain, group.items.length) }}</span>
              </div>
              <div class="article-acts">
                <button class="art-btn" @click="copyMarkdown(group.items, group.pageTitle)">{{ m.copyArticleMd }}</button>
                <button class="art-btn" @click="exportMarkdown(group.items, group.pageTitle)">{{ m.exportArticleMd }}</button>
              </div>
            </div>

            <div class="article-items">
              <div
                v-for="item in group.items"
                :key="item.id"
                class="sub-item"
                :style="{ borderLeftColor: getColorPreset(item.color).dot }"
              >
                <p class="sub-quote">{{ item.text }}</p>

                <div v-if="editingId === item.id" class="edit-box">
                  <textarea
                    v-model="editingNote"
                    rows="2"
                    class="note-textarea"
                    :placeholder="m.notebookNotePlaceholder"
                  />
                  <div class="edit-row">
                    <input
                      v-model="newTagInput"
                      type="text"
                      class="tag-input"
                      :placeholder="m.tagInputPlaceholder"
                      @keyup.enter="addTag(item)"
                    />
                    <div class="edit-btns">
                      <button class="btn-ghost" @click="editingId = null">{{ m.cancel }}</button>
                      <button class="btn-primary" @click="saveNote(item)">{{ m.save }}</button>
                    </div>
                  </div>
                </div>
                <div v-else-if="item.note" class="note-display" @click="startEditNote(item)">
                  <strong>{{ m.notePrefix }}</strong>{{ item.note }}
                </div>

                <div class="sub-foot">
                  <div class="tags-row">
                    <span v-for="tag in item.tags" :key="tag" class="tag-pill">
                      #{{ tag }}
                      <button class="tag-x" @click="removeTag(item, tag)">×</button>
                    </span>
                  </div>
                  <div class="sub-actions">
                    <button class="foot-link" @click="openSourceAtHighlight(item)">{{ m.locateSource }}</button>
                    <button class="foot-link" @click="startEditNote(item)">{{ item.note ? m.edit : m.noteAndTag }}</button>
                    <button class="foot-link danger" @click="deleteItem(item.id)">{{ m.deleteBtn }}</button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        <!-- 视图 2：全部散列卡片瀑布流 -->
        <div v-else class="notes-grid">
          <article
            v-for="item in filteredItems"
            :key="item.id"
            class="note-card"
            :style="{ borderTopColor: getColorPreset(item.color).dot }"
          >
            <div class="card-meta">
              <a
                href="#"
                class="source-title"
                :title="item.url"
                @click.prevent="openSourceAtHighlight(item)"
              >
                {{ item.pageTitle || item.domain }}
              </a>
              <span class="time-str">{{ new Date(item.createdAt).toLocaleDateString() }}</span>
            </div>

            <blockquote
              class="quote-block"
              :style="{
                backgroundColor: item.style === 'underline' ? 'transparent' : getColorPreset(item.color).bg,
                borderBottom: item.style === 'underline' ? `2.5px solid ${getColorPreset(item.color).border}` : 'none'
              }"
            >
              {{ item.text }}
            </blockquote>

            <div v-if="editingId === item.id" class="edit-box">
              <textarea
                v-model="editingNote"
                rows="3"
                class="note-textarea"
                :placeholder="m.notebookNotePlaceholder"
              />
              <div class="edit-row">
                <input
                  v-model="newTagInput"
                  type="text"
                  class="tag-input"
                  :placeholder="m.tagInputPlaceholder"
                  @keyup.enter="addTag(item)"
                />
                <div class="edit-btns">
                  <button class="btn-ghost" @click="editingId = null">{{ m.cancel }}</button>
                  <button class="btn-primary" @click="saveNote(item)">{{ m.save }}</button>
                </div>
              </div>
            </div>
            <div v-else-if="item.note" class="note-display" @click="startEditNote(item)">
              <strong>{{ m.notePrefix }}</strong>{{ item.note }}
            </div>

            <div v-if="item.tags?.length" class="tags-row">
              <span v-for="tag in item.tags" :key="tag" class="tag-pill">
                #{{ tag }}
                <button class="tag-x" @click="removeTag(item, tag)">×</button>
              </span>
            </div>

            <div class="card-footer">
              <button class="foot-link" @click="openSourceAtHighlight(item)">{{ m.locateSource }}</button>
              <button class="foot-link" @click="startEditNote(item)">{{ item.note ? m.edit : m.noteAndTag }}</button>
              <button class="foot-link" @click="copyMarkdown([item], item.pageTitle)">{{ m.copyItemMd }}</button>
              <button class="foot-link danger" @click="deleteItem(item.id)">{{ m.deleteBtn }}</button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
  </div>
</template>

<style scoped>
.notebook-shell {
  display: grid;
  grid-template-columns: 270px 1fr;
  width: 100vw;
  height: 100vh;
  background: #0b1120;
  color: #f8fafc;
  overflow: hidden;
}

.sidebar {
  background: #0f172a;
  border-right: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
  gap: 16px;
  overflow: hidden;
}
.sb-brand { display: flex; align-items: center; gap: 10px; padding-inline: 4px; }
.sb-logo {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, #facc15 0%, #f59e0b 100%);
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sb-title { margin: 0; font-size: 15px; font-weight: 800; }
.sb-sub { font-size: 11px; color: #34d399; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.stat-box {
  background: #131c31;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 8px 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-box strong { font-size: 15px; font-weight: 800; color: #f8fafc; }
.stat-box span { font-size: 10px; color: #64748b; }

.sb-section { display: flex; flex-direction: column; gap: 5px; }
.sb-domains { flex: 1; min-height: 0; }
.domain-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; }
.sb-label { font-size: 11px; font-weight: 700; color: #64748b; padding-inline: 6px; margin-bottom: 2px; }
.sb-nav-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #cbd5e1;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
}
.nav-label { display: inline-flex; align-items: center; gap: 7px; }
.sb-nav-btn:hover { background: #1e293b; }
.sb-nav-btn.active { background: #1e293b; color: #38bdf8; font-weight: 650; }
.domain-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 175px; }
.count-badge {
  font-size: 11px;
  background: #0b1120;
  color: #94a3b8;
  padding: 1px 7px;
  border-radius: 999px;
}

.sb-colors { display: flex; align-items: center; gap: 7px; padding-inline: 6px; }
.color-pill {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
}
.color-pill.active { background: #334155; color: #ffffff; }
.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}
.color-dot.active { border-color: #ffffff; transform: scale(1.2); }

.sb-footer { display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid #1e293b; }
.backup-btn {
  flex: 1;
  text-align: center;
  padding: 7px 6px;
  border-radius: 6px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #cbd5e1;
  font-size: 11.5px;
  cursor: pointer;
}
.backup-btn:hover { background: #334155; color: #ffffff; }

.main-area { display: flex; flex-direction: column; min-width: 0; height: 100vh; }
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 24px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
}
.search-wrap { position: relative; flex: 1; max-width: 440px; display: flex; align-items: center; }
.search-icon { position: absolute; left: 12px; color: #64748b; pointer-events: none; }
.search-input {
  width: 100%;
  padding: 9px 14px 9px 36px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #f8fafc;
  font-size: 13px;
  outline: none;
}
.search-input:focus { border-color: #3b82f6; }

.topbar-actions { display: flex; align-items: center; gap: 12px; }
.view-switcher {
  display: flex;
  background: #1e293b;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid #334155;
}
.view-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 6px;
  cursor: pointer;
}
.view-btn.active { background: #0f172a; color: #f8fafc; }

.export-md-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #2563eb;
  border: none;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 650;
  padding: 9px 15px;
  border-radius: 8px;
  cursor: pointer;
}
.export-md-btn:hover { background: #1d4ed8; }
.export-md-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.cards-viewport { flex: 1; overflow-y: auto; padding: 22px 24px; }
.empty-state { text-align: center; padding: 80px 20px; color: #64748b; }
.empty-icon-box {
  width: 64px;
  height: 64px;
  margin: 0 auto 14px;
  border-radius: 18px;
  background: #131c31;
  border: 1px solid #24324b;
  color: #facc15;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-h { margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #cbd5e1; }
.empty-p { margin: 0; font-size: 13px; }

/* 文章聚合视图 */
.grouped-list { display: flex; flex-direction: column; gap: 18px; max-width: 980px; }
.article-card {
  background: #131c31;
  border: 1px solid #24324b;
  border-radius: 14px;
  padding: 18px 20px;
}
.article-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #1e293b;
  margin-bottom: 14px;
}
.article-meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.article-title {
  color: #f8fafc;
  font-size: 15.5px;
  font-weight: 750;
  text-decoration: none;
}
.article-title:hover { color: #38bdf8; }
.article-sub { font-size: 12px; color: #64748b; }
.article-acts { display: flex; gap: 8px; flex-shrink: 0; }
.art-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
}
.art-btn:hover { background: #334155; color: #ffffff; }

.article-items { display: flex; flex-direction: column; gap: 12px; }
.sub-item {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-left-width: 4px;
  border-radius: 9px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sub-quote { margin: 0; font-size: 13.5px; line-height: 1.65; color: #e2e8f0; }
.sub-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sub-actions { display: flex; gap: 12px; flex-shrink: 0; }

/* 散列卡片视图 */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}
.note-card {
  background: #131c31;
  border: 1px solid #24324b;
  border-top-width: 4px;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.card-meta { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.source-title {
  color: #38bdf8;
  font-size: 12.5px;
  font-weight: 650;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-title:hover { text-decoration: underline; }
.time-str { font-size: 11px; color: #64748b; flex-shrink: 0; }

.quote-block {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13.5px;
  line-height: 1.65;
  color: #111827;
  word-break: break-word;
}
.quote-block[style*="transparent"] {
  color: #f1f5f9;
  padding-inline: 2px;
}

.note-display {
  padding: 8px 10px;
  background: #0b1120;
  border-radius: 7px;
  font-size: 12.5px;
  line-height: 1.55;
  color: #cbd5e1;
  cursor: pointer;
}
.note-textarea {
  width: 100%;
  background: #0b1120;
  border: 1px solid #3b82f6;
  border-radius: 7px;
  color: #f8fafc;
  padding: 8px 10px;
  font-size: 12.5px;
  outline: none;
}
.edit-row { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; gap: 8px; }
.edit-btns { display: flex; gap: 8px; }
.btn-ghost, .btn-primary {
  padding: 5px 12px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  cursor: pointer;
}
.btn-ghost { background: #334155; color: #cbd5e1; }
.btn-primary { background: #2563eb; color: #ffffff; font-weight: 600; }

.tags-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #1e293b;
  color: #93c5fd;
  border: 1px solid #334155;
}
.tag-x {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
}
.tag-input {
  background: #0b1120;
  border: 1px dashed #334155;
  color: #e2e8f0;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  width: 110px;
  outline: none;
}

.card-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #1e293b;
  display: flex;
  gap: 12px;
}
.foot-link {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.foot-link:hover { color: #38bdf8; }
.foot-link.danger { margin-left: auto; }
.foot-link.danger:hover { color: #f87171; }

.toast {
  position: fixed;
  bottom: 24px;
  right: 28px;
  background: #10b981;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 999px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}
</style>
