import { defineContentScript } from 'wxt/sandbox';

const STATE_EVENT = '__super_free_copy_state__';
const STATE_ATTR = 'superFreeCopyState';

interface ProtectorState {
  active: boolean;
  strict: boolean;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    const state: ProtectorState = { active: false, strict: false };

    const applyState = (next?: Partial<ProtectorState>) => {
      if (!next) return;
      if (typeof next.active === 'boolean') state.active = next.active;
      if (typeof next.strict === 'boolean') state.strict = next.strict;
    };

    const raw = document.documentElement?.dataset?.[STATE_ATTR];
    if (raw) {
      try {
        applyState(JSON.parse(raw));
      } catch {
        // 忽略非法状态序列化
      }
    }

    window.addEventListener(STATE_EVENT, (event: Event) => {
      applyState((event as CustomEvent<ProtectorState>).detail);
    });

    let lastUserMouseDownTime = 0;
    window.addEventListener(
      'mousedown',
      () => {
        lastUserMouseDownTime = Date.now();
      },
      true
    );

    const originalRemoveAllRanges = Selection.prototype.removeAllRanges;
    Selection.prototype.removeAllRanges = function (...args) {
      if (state.active && Date.now() - lastUserMouseDownTime < 2000) {
        return;
      }
      return originalRemoveAllRanges.apply(this, args);
    };

    const originalEmpty = Selection.prototype.empty;
    if (originalEmpty) {
      Selection.prototype.empty = function (...args) {
        if (state.active && Date.now() - lastUserMouseDownTime < 2000) {
          return;
        }
        return originalEmpty.apply(this, args);
      };
    }

    const origAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init: ShadowRootInit) {
      if (state.active && state.strict && init && init.mode === 'closed') {
        init = { ...init, mode: 'open' };
      }
      return origAttachShadow.call(this, init);
    };
  }
});
