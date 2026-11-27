const STYLE_ID = '__super_free_copy_style__';

const CSS_CONTENT = `
/* 核心解除文本选择限制 */
* {
  -webkit-user-select: auto !important;
  -moz-user-select: auto !important;
  -ms-user-select: auto !important;
  user-select: auto !important;
  -webkit-touch-callout: default !important;
}

/* 攻破 Canvas/PDF 阅读器隐藏文本层 (如百度文库、PDF.js等) */
.textLayer,
[class*="textLayer"],
.reader-word-layer,
[class*="reader-word"],
[class*="TextLayer"] {
  opacity: 1 !important;
  pointer-events: auto !important;
  z-index: 20 !important;
}

.textLayer span,
[class*="textLayer"] span,
.reader-word-layer span {
  color: #1e293b !important;
  opacity: 1 !important;
}

/* 攻破空透明遮罩层防划选 (针对无内容的绝对定位透明遮罩，设为 none 以实现鼠标手势真正穿透到底层) */
div[style*="position: absolute"][style*="opacity: 0"]:empty,
div[style*="position: fixed"][style*="opacity: 0"]:empty {
  pointer-events: none !important;
}
`;

export class DomUnblocker {
  private active = false;
  private strict = false;
  private cleanTimer: number | null = null;
  private stopHandlers: Array<() => void> = [];

  enable(strict = false) {
    if (this.active && this.strict === strict) return;
    this.disable();
    this.active = true;
    this.strict = strict;

    this.injectStyle();
    this.interceptEvents();
    this.cleanInlineHandlers();
    this.syncPageProtector(true, strict);
  }

  disable() {
    this.active = false;
    this.removeStyle();
    this.stopHandlers.forEach((unsub) => unsub());
    this.stopHandlers = [];
    if (this.cleanTimer) {
      clearInterval(this.cleanTimer);
      this.cleanTimer = null;
    }
    this.syncPageProtector(false, false);
  }

  private injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS_CONTENT;
    (document.head || document.documentElement).appendChild(style);
  }

  private removeStyle() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  private interceptEvents() {
    const eventTypes = ['copy', 'cut', 'contextmenu', 'selectstart'];

    const handler = (e: Event) => {
      if (!this.active) return;
      // 捕获阶段立刻阻止页面业务逻辑拦截
      e.stopImmediatePropagation();
    };

    eventTypes.forEach((type) => {
      window.addEventListener(type, handler, true);
      document.addEventListener(type, handler, true);
      this.stopHandlers.push(() => {
        window.removeEventListener(type, handler, true);
        document.removeEventListener(type, handler, true);
      });
    });

    // 针对快捷键放行保障
    const keyHandler = (e: KeyboardEvent) => {
      if (!this.active) return;
      const isCopy = (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.keyCode === 67);
      const isSelectAll = (e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A' || e.keyCode === 65);
      const isCut = (e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X' || e.keyCode === 88);
      if (isCopy || isSelectAll || isCut) {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', keyHandler, true);
    this.stopHandlers.push(() => window.removeEventListener('keydown', keyHandler, true));
  }

  private cleanInlineHandlers() {
    const clean = () => {
      if (!this.active) return;
      const attrs = ['oncopy', 'oncut', 'oncontextmenu', 'onselectstart', 'ondragstart', 'onbeforecopy'];
      const targets = [document.body, document.documentElement];

      targets.forEach((el) => {
        if (!el) return;
        attrs.forEach((attr) => {
          if (el.hasAttribute(attr)) el.removeAttribute(attr);
          // @ts-ignore
          if (el[attr] !== null) el[attr] = null;
        });

        // 智能解除部分防复制脚本恶意追加的 overflow: hidden 导致滚动条锁死
        if (el.style.overflow === 'hidden') {
          el.style.overflow = '';
        }
        if (el.style.overflowY === 'hidden') {
          el.style.overflowY = '';
        }
      });
    };

    clean();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', clean, { once: true });
    }
    this.cleanTimer = window.setInterval(clean, 2500);
  }

  private syncPageProtector(active: boolean, strict: boolean) {
    const detail = { active, strict };
    if (document.documentElement) {
      document.documentElement.dataset.superFreeCopyState = JSON.stringify(detail);
    }
    window.dispatchEvent(new CustomEvent('__super_free_copy_state__', { detail }));
  }
}
