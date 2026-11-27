import { m } from '../src/locales';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    const win = window as unknown as { __100freeScreenStudioLoaded?: boolean };
    if (win.__100freeScreenStudioLoaded) return;
    win.__100freeScreenStudioLoaded = true;

    let active = false;
    let paused = false;
    let lastMoveAt = 0;
    const CURSOR_STYLE_ID = '__100free_hide_cursor__';
    const PILL_HOST_ID = '__100free_rec_pill__';

    const syncCursorVisibility = (hide: boolean) => {
      const existing = document.getElementById(CURSOR_STYLE_ID);
      if (hide) {
        if (!existing && document.documentElement) {
          const style = document.createElement('style');
          style.id = CURSOR_STYLE_ID;
          style.textContent = '* { cursor: none !important; }';
          document.documentElement.appendChild(style);
        }
      } else {
        existing?.remove();
      }
    };

    const syncFloatingPill = (show: boolean, isPaused: boolean) => {
      const existing = document.getElementById(PILL_HOST_ID);
      if (!show) {
        existing?.remove();
        return;
      }
      if (existing) {
        const dot = existing.shadowRoot?.getElementById('rec-dot');
        const pauseBtn = existing.shadowRoot?.getElementById('pause-btn');
        if (dot) dot.style.background = isPaused ? '#f59e0b' : '#ef4444';
        if (pauseBtn) pauseBtn.textContent = isPaused ? m.pillResume : m.pillPause;
        return;
      }
      const container = document.documentElement || document.body;
      if (!container) return;

      const host = document.createElement('div');
      host.id = PILL_HOST_ID;
      host.style.cssText =
        'position:fixed !important;right:18px !important;bottom:18px !important;z-index:2147483647 !important;display:block !important;pointer-events:auto !important;width:auto !important;height:auto !important;visibility:visible !important;opacity:1 !important;';
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          .pill {
            display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;
            background:rgba(20,20,22,0.92);border:1px solid rgba(255,255,255,0.14);
            color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
            font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,0.4);cursor:default !important;
          }
          .pill * { cursor:pointer !important; }
          .dot { width:8px;height:8px;border-radius:50%;background:${isPaused ? '#f59e0b' : '#ef4444'};flex-shrink:0; }
          button {
            border:none;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:600;
            background:#27272c;color:#e4e4e7;
          }
          button:hover { background:#3f3f46;color:#fff; }
          .stop { background:#dc2626;color:#fff; }
          .stop:hover { background:#ef4444; }
        </style>
        <div class="pill">
          <span id="rec-dot" class="dot"></span>
          <button id="mark-btn" title="${m.pillMarkTooltip}">${m.pillMark}</button>
          <button id="pause-btn">${isPaused ? m.pillResume : m.pillPause}</button>
          <button id="stop-btn" class="stop">${m.pillStop}</button>
        </div>
      `;

      shadow.getElementById('mark-btn')?.addEventListener('click', () => {
        void chrome.runtime.sendMessage({
          type: 'RECORDING_BOOKMARK',
          payload: { ts: Date.now() }
        }).catch(() => {});
      });
      shadow.getElementById('pause-btn')?.addEventListener('click', () => {
        void chrome.runtime.sendMessage({ type: 'CONTROL_TOGGLE_PAUSE' }).catch(() => {});
      });
      shadow.getElementById('stop-btn')?.addEventListener('click', () => {
        void chrome.runtime.sendMessage({ type: 'CONTROL_STOP_RECORDING' }).catch(() => {});
      });

      container.appendChild(host);
    };

    const applyState = (rec: boolean, isP: boolean) => {
      active = rec;
      paused = isP;
      syncCursorVisibility(rec && !isP);
      syncFloatingPill(rec, isP);
    };

    window.addEventListener('DOMContentLoaded', () => {
      if (active) {
        syncCursorVisibility(!paused);
        syncFloatingPill(true, paused);
      }
    });

    chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.isRecording) {
        applyState(true, Boolean(res.isPaused));
      }
    });

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'RECORDING_STATE_CHANGED') {
        applyState(Boolean(message.isRecording), Boolean(message.isPaused));
        sendResponse({ ok: true });
      }
    });

    const isInsidePill = (e: Event) => {
      const target = e.target as HTMLElement | null;
      return target?.id === PILL_HOST_ID;
    };

    const getNormalizedCoords = (e: MouseEvent | PointerEvent) => {
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      return {
        x: Math.max(0, Math.min(1, e.clientX / vw)),
        y: Math.max(0, Math.min(1, e.clientY / vh))
      };
    };

    window.addEventListener(
      'mousemove',
      (e) => {
        if (!active || paused || isInsidePill(e)) return;
        const now = performance.now();
        if (now - lastMoveAt < 32) return;
        lastMoveAt = now;

        const { x, y } = getNormalizedCoords(e);
        void chrome.runtime.sendMessage({
          type: 'RECORDING_CURSOR_MOVE',
          payload: { ts: Date.now(), x, y }
        }).catch(() => {});
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      'pointerdown',
      (e) => {
        if (!active || paused || isInsidePill(e)) return;
        const { x, y } = getNormalizedCoords(e);
        void chrome.runtime.sendMessage({
          type: 'RECORDING_CLICK',
          payload: { ts: Date.now(), x, y, button: e.button }
        }).catch(() => {});
      },
      { passive: true, capture: true }
    );

    const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);
    const FUNCTION_KEYS = new Set([
      'Enter',
      'Escape',
      'Tab',
      'Backspace',
      'Delete',
      'Space',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight'
    ]);

    const formatKeyLabel = (e: KeyboardEvent): string | null => {
      if (e.repeat || MODIFIER_KEYS.has(e.key)) return null;
      const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
      const keyName = e.code === 'Space' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const isFn = FUNCTION_KEYS.has(keyName) || /^F\d{1,2}$/.test(keyName);
      if (!hasModifier && !isFn) return null;

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.metaKey) parts.push('Cmd');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      parts.push(keyName === 'Escape' ? 'Esc' : keyName);
      return parts.join(' + ');
    };

    window.addEventListener(
      'keydown',
      (e) => {
        if (!active || paused) return;
        const label = formatKeyLabel(e);
        if (!label) return;
        void chrome.runtime.sendMessage({
          type: 'RECORDING_KEYSTROKE',
          payload: { ts: Date.now(), label }
        }).catch(() => {});
      },
      { passive: true, capture: true }
    );
  }
});
