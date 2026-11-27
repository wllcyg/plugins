import { m } from '../locales';

/**
 * 选中文本悬浮快捷复制条（使用 Shadow DOM 样式完全隔离）
 */
export class FloatingCopyButton {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private button: HTMLButtonElement | null = null;
  private enabled = true;

  constructor() {
    this.init();
  }

  setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) this.hide();
  }

  private init() {
    document.addEventListener('mouseup', (e) => {
      if (!this.enabled) return;
      // 避免点击自身时被重新触发或隐藏
      if (this.host && this.host.contains(e.target as Node)) return;

      setTimeout(() => this.handleSelection(e), 50);
    });

    document.addEventListener('mousedown', (e) => {
      if (this.host && !this.host.contains(e.target as Node)) {
        this.hide();
      }
    });
  }

  private ensureMounted() {
    if (this.host) return;

    this.host = document.createElement('div');
    this.host.id = '__super_free_copy_float__';
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        z-index: 2147483647;
        pointer-events: auto;
      }
      .copy-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        background: #1e293b;
        color: #ffffff;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 500;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        cursor: pointer;
        user-select: none;
        transition: all 0.15s ease;
      }
      .copy-btn:hover {
        background: #334155;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.24);
      }
      .copy-btn:active {
        transform: translateY(0);
      }
      .copy-btn.copied {
        background: #059669;
        border-color: #10b981;
      }
      .icon {
        width: 13px;
        height: 13px;
      }
    `;

    this.button = document.createElement('button');
    this.button.className = 'copy-btn';
    this.button.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span class="label">${m.floatCopy}</span>
    `;

    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.doCopy();
    });

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.button);
    document.documentElement.appendChild(this.host);
  }

  private handleSelection(e: MouseEvent) {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (!text || text.length === 0) {
      this.hide();
      return;
    }

    this.ensureMounted();
    if (!this.host) return;

    // 确定浮动按钮位置（鼠标抬起位置微向上偏移）
    const x = Math.min(e.clientX + 8, window.innerWidth - 70);
    const y = Math.max(e.clientY - 38, 10);

    this.host.style.left = `${x}px`;
    this.host.style.top = `${y}px`;
    this.host.style.display = 'block';

    if (this.button) {
      this.button.className = 'copy-btn';
      this.button.querySelector('.label')!.textContent = m.floatCopy;
    }
  }

  private async doCopy() {
    const selection = window.getSelection();
    const text = selection ? selection.toString() : '';
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      if (this.button) {
        this.button.classList.add('copied');
        this.button.querySelector('.label')!.textContent = m.floatCopied;
        setTimeout(() => this.hide(), 1000);
      }
    } catch {
      // 降级使用 document.execCommand
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();

      if (this.button) {
        this.button.classList.add('copied');
        this.button.querySelector('.label')!.textContent = m.floatCopied;
        setTimeout(() => this.hide(), 1000);
      }
    }
  }

  private hide() {
    if (this.host) {
      this.host.style.display = 'none';
    }
  }

  destroy() {
    if (this.host) {
      this.host.remove();
      this.host = null;
    }
  }
}
