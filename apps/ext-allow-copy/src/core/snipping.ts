import { m } from '../locales';

/**
 * 页面框选文本极速提取器
 * 核心原理：无论网页通过 Canvas 覆盖、透明文字层还是特殊定位，
 * 框选区域内，穿透所有层级深度抽取底层 Text 节点与 Range 文本，毫秒级复制。
 */
export class SnippingExtractor {
  private overlay: HTMLElement | null = null;
  private isSelecting = false;
  private startX = 0;
  private startY = 0;
  private selectionBox: HTMLElement | null = null;

  start() {
    this.cleanup();

    this.overlay = document.createElement('div');
    this.overlay.id = '__free_copy_snipping_overlay__';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      background: rgba(15, 23, 42, 0.35);
      cursor: crosshair;
      user-select: none;
    `;

    const tip = document.createElement('div');
    tip.style.cssText = `
      position: absolute;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 18px;
      background: #1e293b;
      color: #ffffff;
      font-size: 13px;
      font-family: sans-serif;
      font-weight: 500;
      border-radius: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      pointer-events: none;
    `;
    tip.textContent = m.snippingTip;

    this.selectionBox = document.createElement('div');
    this.selectionBox.style.cssText = `
      position: absolute;
      border: 2px dashed #2563eb;
      background: rgba(37, 99, 235, 0.15);
      display: none;
      pointer-events: none;
    `;

    this.overlay.appendChild(tip);
    this.overlay.appendChild(this.selectionBox);

    this.bindEvents();
    document.documentElement.appendChild(this.overlay);
  }

  private bindEvents() {
    if (!this.overlay) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      this.isSelecting = true;
      this.startX = e.clientX;
      this.startY = e.clientY;

      if (this.selectionBox) {
        this.selectionBox.style.left = `${this.startX}px`;
        this.selectionBox.style.top = `${this.startY}px`;
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
        this.selectionBox.style.display = 'block';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isSelecting || !this.selectionBox) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      const left = Math.min(this.startX, currentX);
      const top = Math.min(this.startY, currentY);
      const width = Math.abs(currentX - this.startX);
      const height = Math.abs(currentY - this.startY);

      this.selectionBox.style.left = `${left}px`;
      this.selectionBox.style.top = `${top}px`;
      this.selectionBox.style.width = `${width}px`;
      this.selectionBox.style.height = `${height}px`;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!this.isSelecting) return;
      this.isSelecting = false;

      const endX = e.clientX;
      const endY = e.clientY;

      const rect = {
        left: Math.min(this.startX, endX),
        top: Math.min(this.startY, endY),
        right: Math.max(this.startX, endX),
        bottom: Math.max(this.startY, endY)
      };

      this.cleanup();

      // 忽略微小误触
      if (rect.right - rect.left > 8 && rect.bottom - rect.top > 8) {
        this.extractTextInRect(rect);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.cleanup();
      }
    };

    this.overlay.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
    window.addEventListener('keydown', onKeyDown, { once: true });
    window.addEventListener('blur', () => this.cleanup(), { once: true });
  }

  private extractTextInRect(rect: { left: number; top: number; right: number; bottom: number }) {
    const extracted: string[] = [];

    // 采用 TreeWalker 穿透提取指定视口区域内所有有效文本节点
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.nextNode();

    while (node) {
      const parent = node.parentElement;
      if (parent && parent.offsetParent !== null) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          const range = document.createRange();
          range.selectNodeContents(node);
          const bRect = range.getBoundingClientRect();

          // 碰撞检测：判断文本节点是否在框选区域内
          const isOverlap = !(
            bRect.right < rect.left ||
            bRect.left > rect.right ||
            bRect.bottom < rect.top ||
            bRect.top > rect.bottom
          );

          if (isOverlap) {
            extracted.push(text);
          }
        }
      }
      node = walker.nextNode();
    }

    const resultText = extracted.join('\n');
    this.showResultModal(resultText);
  }

  private showResultModal(text: string) {
    const hasText = text.trim().length > 0;
    const modalHost = document.createElement('div');
    modalHost.id = '__free_copy_result_modal__';
    const shadow = modalHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(15, 23, 42, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(2px);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .panel {
        width: 480px;
        max-width: 90vw;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }
      .header {
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f1f5f9;
      }
      .title {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: #1e293b;
      }
      .close-btn {
        background: transparent;
        border: none;
        font-size: 18px;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
      }
      .close-btn:hover { color: #1e293b; }
      .body {
        padding: 16px 18px;
      }
      .textarea {
        width: 100%;
        height: 180px;
        box-sizing: border-box;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px;
        font-size: 13px;
        line-height: 1.6;
        color: #334155;
        resize: vertical;
        outline: none;
      }
      .textarea:focus {
        border-color: #2563eb;
      }
      .empty-tip {
        color: #64748b;
        font-size: 13px;
        text-align: center;
        padding: 40px 0;
      }
      .footer {
        padding: 12px 18px;
        background: #f8fafc;
        border-top: 1px solid #f1f5f9;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .btn {
        padding: 7px 14px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.15s ease;
      }
      .btn-primary {
        background: #2563eb;
        color: #ffffff;
      }
      .btn-primary:hover { background: #1d4ed8; }
      .btn-secondary {
        background: #e2e8f0;
        color: #334155;
      }
      .btn-secondary:hover { background: #cbd5e1; }
    `;

    const container = document.createElement('div');
    container.className = 'backdrop';
    container.innerHTML = `
      <div class="panel">
        <div class="header">
          <h4 class="title">${m.snippingResultTitle(hasText, text.length)}</h4>
          <button class="close-btn" id="close">&times;</button>
        </div>
        <div class="body">
          ${
            hasText
              ? `<textarea class="textarea" id="output">${text}</textarea>`
              : `<div class="empty-tip">${m.snippingEmptyTitle}<br><small style="color:#94a3b8">${m.snippingEmptyHint}</small></div>`
          }
        </div>
        <div class="footer">
          <button class="btn btn-secondary" id="cancel">${m.closeBtn}</button>
          ${hasText ? `<button class="btn btn-primary" id="copy">${m.copyAndCloseBtn}</button>` : ''}
        </div>
      </div>
    `;

    const close = () => modalHost.remove();

    container.querySelector('#close')?.addEventListener('click', close);
    container.querySelector('#cancel')?.addEventListener('click', close);

    const copyBtn = container.querySelector('#copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const val = (container.querySelector('#output') as HTMLTextAreaElement)?.value || text;
        await navigator.clipboard.writeText(val);
        copyBtn.textContent = m.copiedFeedback;
        setTimeout(close, 400);
      });
    }

    shadow.appendChild(style);
    shadow.appendChild(container);
    document.documentElement.appendChild(modalHost);
  }

  private cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.isSelecting = false;
  }
}
