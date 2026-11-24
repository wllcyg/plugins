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

/* 攻破空透明遮罩层防划选 (针对无内容的绝对定位透明遮罩自动穿透) */
div[style*="position: absolute"][style*="opacity: 0"]:empty,
div[style*="position: fixed"][style*="opacity: 0"]:empty,
div[style*="pointer-events: none"] {
  pointer-events: auto !important;
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
    this.injectPageContextProtector(strict);
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
      });
    };

    clean();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', clean, { once: true });
    }
    this.cleanTimer = window.setInterval(clean, 2500);
  }

  /**
   * 注入页面上下文保护脚本：
   * 1. 破解定时器恶意清空选区 (removeAllRanges/empty)
   * 2. 强力模式下重置 EventTarget 和 ShadowDOM 封闭限制
   */
  private injectPageContextProtector(strict: boolean) {
    const script = document.createElement('script');
    script.textContent = `
      (() => {
        try {
          // 防御恶意代码不断调用 removeAllRanges 强行清空用户选区
          const originalRemoveAllRanges = Selection.prototype.removeAllRanges;
          const originalEmpty = Selection.prototype.empty;
          
          let lastUserMouseDownTime = 0;
          window.addEventListener('mousedown', () => { lastUserMouseDownTime = Date.now(); }, true);

          Selection.prototype.removeAllRanges = function() {
            // 如果用户在 2 秒内正在进行鼠标划选，拦截恶意脚本的主动清空
            if (Date.now() - lastUserMouseDownTime < 2000) {
              return;
            }
            return originalRemoveAllRanges.apply(this, arguments);
          };

          if (originalEmpty) {
            Selection.prototype.empty = function() {
              if (Date.now() - lastUserMouseDownTime < 2000) {
                return;
              }
              return originalEmpty.apply(this, arguments);
            };
          }

          ${strict ? `
          // 强力模式：强制解除 Shadow DOM closed 模式以穿透隐藏节点
          const origAttachShadow = Element.prototype.attachShadow;
          Element.prototype.attachShadow = function(init) {
            if (init && init.mode === 'closed') {
              init.mode = 'open';
            }
            return origAttachShadow.call(this, init);
          };
          ` : ''}
        } catch(e) {}
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }
}
