import { DEFAULT_SETTINGS, HighlightItem, HighlighterSettings } from '../types';

const STORAGE_HIGHLIGHTS_KEY = 'hl_items_v1';
const STORAGE_SETTINGS_KEY = 'hl_settings_v1';

/**
 * 规范化页面 URL（去除 hash 锚点，保留 path 与 query）
 */
export function normalizePageUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.hash = '';
    return u.toString();
  } catch {
    return rawUrl.split('#')[0] || rawUrl;
  }
}

export function extractDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return '';
  }
}

export async function getAllHighlights(): Promise<HighlightItem[]> {
  const data = await chrome.storage.local.get(STORAGE_HIGHLIGHTS_KEY);
  const list = data?.[STORAGE_HIGHLIGHTS_KEY];
  return Array.isArray(list) ? list : [];
}

export async function getPageHighlights(url: string): Promise<HighlightItem[]> {
  const norm = normalizePageUrl(url);
  const all = await getAllHighlights();
  return all.filter((item) => item.url === norm).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveAllHighlights(items: HighlightItem[]): Promise<void> {
  const clean = JSON.parse(JSON.stringify(items));
  await chrome.storage.local.set({ [STORAGE_HIGHLIGHTS_KEY]: clean });
}

export async function upsertHighlight(item: HighlightItem): Promise<HighlightItem[]> {
  const all = await getAllHighlights();
  const idx = all.findIndex((x) => x.id === item.id);
  const cleanItem: HighlightItem = JSON.parse(JSON.stringify(item));
  if (idx >= 0) {
    all[idx] = cleanItem;
  } else {
    all.unshift(cleanItem);
  }
  await saveAllHighlights(all);
  return all;
}

export async function deleteHighlightById(id: string): Promise<HighlightItem[]> {
  const all = await getAllHighlights();
  const next = all.filter((x) => x.id !== id);
  await saveAllHighlights(next);
  return next;
}

export async function getSettings(): Promise<HighlighterSettings> {
  const data = await chrome.storage.local.get(STORAGE_SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(data?.[STORAGE_SETTINGS_KEY] || {}) };
}

export async function saveSettings(partial: Partial<HighlighterSettings>): Promise<HighlighterSettings> {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ [STORAGE_SETTINGS_KEY]: JSON.parse(JSON.stringify(next)) });
  return next;
}

/**
 * 将一批高亮笔记导出为纯净 Markdown（按网页标题自动分组）
 */
export function exportHighlightsToMarkdown(items: HighlightItem[], title = '网页荧光笔学习笔记'): string {
  const grouped = new Map<string, { pageTitle: string; url: string; list: HighlightItem[] }>();
  for (const item of items) {
    const existing = grouped.get(item.url);
    if (existing) {
      existing.list.push(item);
    } else {
      grouped.set(item.url, { pageTitle: item.pageTitle || item.url, url: item.url, list: [item] });
    }
  }

  const lines: string[] = [
    `# ${title}`,
    `> 导出时间：${new Date().toLocaleString()} · 共 ${items.length} 条重点摘录`,
    ''
  ];

  for (const group of grouped.values()) {
    lines.push(`## [${group.pageTitle}](${group.url})`, '');
    const sorted = [...group.list].sort((a, b) => a.createdAt - b.createdAt);
    for (const item of sorted) {
      lines.push(`- > ${item.text.replace(/\n+/g, '\n  > ')}`);
      if (item.note?.trim()) {
        lines.push(`  - **批注**：${item.note.trim()}`);
      }
      if (item.tags?.length) {
        lines.push(`  - **标签**：${item.tags.map((t) => `#${t}`).join(' ')}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

export function triggerTextDownload(content: string, filename: string, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
