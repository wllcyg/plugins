import { defineContentScript } from 'wxt/sandbox';
import { HIGHLIGHT_COLORS, HighlightColorId, HighlightItem, HighlightStyle, HighlighterSettings } from '../src/types';
import {
  extractDomain,
  getPageHighlights,
  getSettings,
  normalizePageUrl,
  deleteHighlightById,
  upsertHighlight
} from '../src/core/storage';
import {
  HIGHLIGHT_ATTR,
  extractSelectionAnchor,
  removeHighlightFromPage,
  restoreHighlightOnPage,
  scrollToHighlight,
  updateHighlightAppearance,
  wrapRangeWithHighlight
} from '../src/core/anchor';

const SVG_UNDERLINE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`;
const SVG_FILL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>`;
const SVG_NOTE = `<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const SVG_COPY = `<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

function isEditableNode(node: Node | null): boolean {
  let el: HTMLElement | null = node instanceof HTMLElement ? node : node?.parentElement || null;
  while (el) {
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main() {
    if (document.getElementById('100free-hl-host')) return;

    let settings: HighlighterSettings = await getSettings();
    let pageItems: HighlightItem[] = await getPageHighlights(window.location.href);
    let currentRange: Range | null = null;
    let activeEditId: string | null = null;

    const host = document.createElement('div');
    host.id = '100free-hl-host';
    host.style.cssText = 'position: fixed; z-index: 2147483647; top: 0; left: 0; width: 0; height: 0; pointer-events: none;';
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .hl-toolbar {
        position: fixed;
        display: none;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 999px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        pointer-events: auto;
        transform: translateX(-50%);
        animation: hlPop 0.14s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes hlPop {
        from { opacity: 0; transform: translate(-50%, 6px) scale(0.95); }
        to { opacity: 1; transform: translate(-50%, 0) scale(1); }
      }
      .color-dot {
        width: 17px;
        height: 17px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.18);
        cursor: pointer;
        transition: transform 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
        padding: 0;
      }
      .color-dot:hover {
        transform: scale(1.22);
        border-color: #ffffff;
        box-shadow: 0 0 8px rgba(255,255,255,0.35);
      }
      .divider { width: 1px; height: 14px; background: rgba(148, 163, 184, 0.24); margin: 0 2px; }
      .tool-btn {
        background: transparent;
        border: none;
        color: #cbd5e1;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 999px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: background 0.14s, color 0.14s;
        white-space: nowrap;
      }
      .tool-btn:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff; }
      .tool-btn.active { background: #2563eb; color: #ffffff; }

      .note-popover {
        position: fixed;
        display: none;
        width: 316px;
        background: rgba(15, 23, 42, 0.96);
        backdrop-filter: blur(16px);
        color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 14px;
        padding: 12px;
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.06);
        pointer-events: auto;
        animation: popFade 0.14s ease-out;
      }
      @keyframes popFade {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .pop-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .pop-colors { display: flex; gap: 6px; align-items: center; }
      .pop-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 17px;
        line-height: 1;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 6px;
      }
      .pop-close:hover { background: rgba(255,255,255,0.08); color: #ffffff; }
      .pop-quote {
        font-size: 12px;
        line-height: 1.5;
        color: #cbd5e1;
        background: rgba(30, 41, 59, 0.75);
        border-left: 3px solid #facc15;
        border-radius: 0 6px 6px 0;
        padding: 6px 9px;
        margin-bottom: 10px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .pop-textarea {
        width: 100%;
        min-height: 76px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        color: #f8fafc;
        padding: 8px 10px;
        font-size: 12.5px;
        line-height: 1.5;
        resize: vertical;
        outline: none;
        transition: border-color 0.15s;
      }
      .pop-textarea:focus { border-color: #3b82f6; }
      .pop-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 10px;
      }
      .btn-del {
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #fca5a5;
        font-size: 11.5px;
        font-weight: 500;
        padding: 5px 10px;
        border-radius: 7px;
        cursor: pointer;
      }
      .btn-del:hover { background: rgba(239, 68, 68, 0.25); color: #ffffff; }
      .btn-save {
        background: #2563eb;
        border: none;
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 13px;
        border-radius: 7px;
        cursor: pointer;
      }
      .btn-save:hover { background: #1d4ed8; }
    `;
    shadow.appendChild(styleEl);

    const toolbar = document.createElement('div');
    toolbar.className = 'hl-toolbar';

    let currentStyleMode: HighlightStyle = settings.defaultStyle || 'fill';

    HIGHLIGHT_COLORS.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-dot';
      btn.title = `${c.name}高亮`;
      btn.style.backgroundColor = c.dot;
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        void createHighlightFromCurrentRange(c.id, false);
      });
      toolbar.appendChild(btn);
    });

    const div1 = document.createElement('span');
    div1.className = 'divider';
    toolbar.appendChild(div1);

    const styleToggleBtn = document.createElement('button');
    styleToggleBtn.type = 'button';
    styleToggleBtn.className = 'tool-btn';
    styleToggleBtn.title = '切换荧光填充 / 下划线模式';
    const syncStyleBtn = () => {
      styleToggleBtn.innerHTML = currentStyleMode === 'underline' ? `${SVG_UNDERLINE}<span>下划线</span>` : `${SVG_FILL}<span>填充</span>`;
      styleToggleBtn.classList.toggle('active', currentStyleMode === 'underline');
    };
    syncStyleBtn();
    styleToggleBtn.addEventListener('mousedown', (e) => e.preventDefault());
    styleToggleBtn.addEventListener('click', () => {
      currentStyleMode = currentStyleMode === 'fill' ? 'underline' : 'fill';
      syncStyleBtn();
    });
    toolbar.appendChild(styleToggleBtn);

    const noteBtn = document.createElement('button');
    noteBtn.type = 'button';
    noteBtn.className = 'tool-btn';
    noteBtn.innerHTML = `${SVG_NOTE}<span>批注</span>`;
    noteBtn.addEventListener('mousedown', (e) => e.preventDefault());
    noteBtn.addEventListener('click', () => {
      void createHighlightFromCurrentRange(settings.defaultColor || 'yellow', true);
    });
    toolbar.appendChild(noteBtn);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'tool-btn';
    copyBtn.innerHTML = `${SVG_COPY}<span>复制</span>`;
    copyBtn.addEventListener('mousedown', (e) => e.preventDefault());
    copyBtn.addEventListener('click', () => {
      const txt = currentRange?.toString() || window.getSelection()?.toString() || '';
      if (txt) navigator.clipboard.writeText(txt).catch(() => {});
      hideToolbar();
    });
    toolbar.appendChild(copyBtn);

    shadow.appendChild(toolbar);

    const popover = document.createElement('div');
    popover.className = 'note-popover';
    popover.innerHTML = `
      <div class="pop-head">
        <div class="pop-colors"></div>
        <button type="button" class="pop-close" title="关闭">×</button>
      </div>
      <div class="pop-quote"></div>
      <textarea class="pop-textarea" placeholder="写下你的想法或批注（Ctrl+Enter 快捷保存）..."></textarea>
      <div class="pop-actions">
        <button type="button" class="btn-del">删除高亮</button>
        <div style="display:flex;gap:6px;align-items:center;">
          <button type="button" class="tool-btn pop-style-btn" title="切换填充/下划线">${SVG_UNDERLINE}</button>
          <button type="button" class="btn-save">保存批注</button>
        </div>
      </div>
    `;
    shadow.appendChild(popover);

    const popColorsWrap = popover.querySelector('.pop-colors')!;
    const popQuote = popover.querySelector<HTMLElement>('.pop-quote')!;
    const popTextarea = popover.querySelector<HTMLTextAreaElement>('.pop-textarea')!;
    const popStyleBtn = popover.querySelector<HTMLButtonElement>('.pop-style-btn')!;

    HIGHLIGHT_COLORS.forEach((c) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'color-dot';
      dot.title = c.name;
      dot.style.backgroundColor = c.dot;
      dot.addEventListener('click', async () => {
        if (!activeEditId) return;
        const target = pageItems.find((x) => x.id === activeEditId);
        if (!target) return;
        target.color = c.id;
        target.updatedAt = Date.now();
        popQuote.style.borderLeftColor = c.dot;
        updateHighlightAppearance(target.id, target.color, target.style, Boolean(target.note.trim()));
        await upsertHighlight(target);
      });
      popColorsWrap.appendChild(dot);
    });

    const saveActiveNote = async () => {
      if (!activeEditId) return;
      const target = pageItems.find((x) => x.id === activeEditId);
      if (!target) return;
      target.note = popTextarea.value.trim();
      target.updatedAt = Date.now();
      updateHighlightAppearance(target.id, target.color, target.style, Boolean(target.note));
      await upsertHighlight(target);
      hidePopover();
    };

    popover.querySelector('.pop-close')!.addEventListener('click', () => hidePopover());
    popStyleBtn.addEventListener('click', async () => {
      if (!activeEditId) return;
      const target = pageItems.find((x) => x.id === activeEditId);
      if (!target) return;
      target.style = target.style === 'fill' ? 'underline' : 'fill';
      target.updatedAt = Date.now();
      updateHighlightAppearance(target.id, target.color, target.style, Boolean(target.note.trim()));
      await upsertHighlight(target);
    });

    popover.querySelector('.btn-del')!.addEventListener('click', async () => {
      if (!activeEditId) return;
      const id = activeEditId;
      removeHighlightFromPage(id);
      pageItems = pageItems.filter((x) => x.id !== id);
      await deleteHighlightById(id);
      hidePopover();
    });

    popover.querySelector('.btn-save')!.addEventListener('click', () => {
      void saveActiveNote();
    });
    popTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void saveActiveNote();
      }
    });

    function hideToolbar() {
      toolbar.style.display = 'none';
    }

    function hidePopover() {
      popover.style.display = 'none';
      activeEditId = null;
    }

    function showToolbarAtRect(rect: DOMRect) {
      if (!settings.toolbarEnabled) return;
      const top = Math.max(12, rect.top - 48);
      const left = Math.min(window.innerWidth - 190, Math.max(190, rect.left + rect.width / 2));
      toolbar.style.top = `${top}px`;
      toolbar.style.left = `${left}px`;
      toolbar.style.display = 'flex';
    }

    function showPopoverAtEl(el: HTMLElement, item: HighlightItem) {
      activeEditId = item.id;
      const colorPreset = HIGHLIGHT_COLORS.find((c) => c.id === item.color) || HIGHLIGHT_COLORS[0];
      popQuote.textContent = item.text;
      popQuote.style.borderLeftColor = colorPreset.dot;
      popTextarea.value = item.note || '';
      const rect = el.getBoundingClientRect();
      const top = rect.bottom + 10 + 235 > window.innerHeight ? Math.max(12, rect.top - 245) : rect.bottom + 10;
      const left = Math.min(window.innerWidth - 330, Math.max(12, rect.left));
      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
      popover.style.display = 'block';
      setTimeout(() => popTextarea.focus(), 30);
    }

    async function createHighlightFromCurrentRange(color: HighlightColorId, openNoteAfter: boolean) {
      const sel = window.getSelection();
      const range = currentRange || (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
      if (!range || range.collapsed) return;

      const anchor = extractSelectionAnchor(range);
      if (!anchor || !anchor.text) return;

      const id = `hl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const now = Date.now();
      const newItem: HighlightItem = {
        id,
        url: normalizePageUrl(window.location.href),
        pageTitle: document.title || window.location.hostname,
        domain: extractDomain(window.location.href),
        text: anchor.text,
        prefix: anchor.prefix,
        suffix: anchor.suffix,
        color,
        style: currentStyleMode,
        note: '',
        tags: [],
        createdAt: now,
        updatedAt: now
      };

      const marks = wrapRangeWithHighlight(range, id, color, currentStyleMode, false);
      sel?.removeAllRanges();
      currentRange = null;
      hideToolbar();

      if (marks.length > 0) {
        pageItems.push(newItem);
        await upsertHighlight(newItem);
        if (openNoteAfter) {
          showPopoverAtEl(marks[0], newItem);
        }
      }
    }

    document.addEventListener('mouseup', (e) => {
      if (host.contains(e.target as Node)) return;

      const targetMark = (e.target as HTMLElement | null)?.closest?.(`[${HIGHLIGHT_ATTR}]`) as HTMLElement | null;
      if (targetMark && window.getSelection()?.isCollapsed) {
        const id = targetMark.getAttribute(HIGHLIGHT_ATTR);
        const item = pageItems.find((x) => x.id === id);
        if (item) {
          hideToolbar();
          showPopoverAtEl(targetMark, item);
          return;
        }
      }

      if (isEditableNode(e.target as Node)) {
        hideToolbar();
        return;
      }

      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim() || isEditableNode(sel.anchorNode)) {
          hideToolbar();
          return;
        }
        const range = sel.getRangeAt(0);
        currentRange = range.cloneRange();
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          hidePopover();
          showToolbarAtRect(rect);
        }
      }, 15);
    });

    document.addEventListener('mousedown', (e) => {
      if (host.contains(e.target as Node)) return;
      const targetMark = (e.target as HTMLElement | null)?.closest?.(`[${HIGHLIGHT_ATTR}]`);
      if (!targetMark) {
        hidePopover();
      }
    });

    function restoreAll(): boolean {
      let allRestored = true;
      for (const item of pageItems) {
        if (!restoreHighlightOnPage(item)) {
          allRestored = false;
        }
      }
      return allRestored;
    }

    if (pageItems.length > 0 && !restoreAll()) {
      let restoreTimer: ReturnType<typeof setTimeout> | null = null;
      const observer = new MutationObserver(() => {
        if (restoreTimer) clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
          if (restoreAll()) {
            observer.disconnect();
          }
        }, 250);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 18000);
    }

    // 兼容 SPA 无刷新路由切换
    let lastNormalizedUrl = normalizePageUrl(window.location.href);
    setInterval(async () => {
      const nextUrl = normalizePageUrl(window.location.href);
      if (nextUrl !== lastNormalizedUrl) {
        lastNormalizedUrl = nextUrl;
        pageItems = await getPageHighlights(nextUrl);
        restoreAll();
      }
    }, 1000);

    const hashMatch = window.location.hash.match(/100free-hl=([^&]+)/);
    if (hashMatch?.[1]) {
      const targetId = decodeURIComponent(hashMatch[1]);
      setTimeout(() => scrollToHighlight(targetId), 600);
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.action === 'HIGHLIGHT_SELECTION') {
        void createHighlightFromCurrentRange(settings.defaultColor || 'yellow', false);
        sendResponse({ ok: true });
      } else if (msg?.action === 'SCROLL_TO_HIGHLIGHT' && msg.id) {
        const ok = scrollToHighlight(msg.id);
        sendResponse({ ok });
      } else if (msg?.action === 'REMOVE_HIGHLIGHT' && msg.id) {
        removeHighlightFromPage(msg.id);
        pageItems = pageItems.filter((x) => x.id !== msg.id);
        sendResponse({ ok: true });
      } else if (msg?.action === 'UPDATE_HIGHLIGHT' && msg.item) {
        const idx = pageItems.findIndex((x) => x.id === msg.item.id);
        if (idx >= 0) pageItems[idx] = msg.item;
        updateHighlightAppearance(msg.item.id, msg.item.color, msg.item.style, Boolean(msg.item.note?.trim()));
        sendResponse({ ok: true });
      } else if (msg?.action === 'SET_TOOLBAR_ENABLED') {
        settings.toolbarEnabled = Boolean(msg.enabled);
        if (!settings.toolbarEnabled) hideToolbar();
        sendResponse({ ok: true });
      } else if (msg?.action === 'UPDATE_SETTINGS' && msg.settings) {
        settings = { ...settings, ...msg.settings };
        currentStyleMode = settings.defaultStyle || 'fill';
        syncStyleBtn();
        sendResponse({ ok: true });
      }
    });
  }
});
