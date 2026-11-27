import { extractElementStyles } from './extractor';
import { m } from '../locales';
import { StyleSummary } from '../types';

export class InspectorOverlay {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private highlightBox: HTMLElement | null = null;
  private tagBadge: HTMLElement | null = null;
  private card: HTMLElement | null = null;
  
  private active = false;
  private isFrozen = false;
  private currentElement: HTMLElement | null = null;
  private currentStyles: StyleSummary | null = null;

  enable() {
    if (this.active) return;
    this.active = true;
    this.ensureMounted();
    this.bindEvents();
  }

  disable() {
    this.active = false;
    this.isFrozen = false;
    this.hide();
    this.unbindEvents();
  }

  private ensureMounted() {
    if (this.host) return;

    this.host = document.createElement('div');
    this.host.id = '__css_inspector_overlay_host__';
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 2147483645;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .highlight-box {
        position: fixed;
        border: 2px solid #0284c7;
        background: rgba(14, 165, 233, 0.08);
        border-radius: 2px;
        pointer-events: none;
        box-sizing: border-box;
        display: none;
        transition: all 0.05s ease-out;
      }
      .tag-badge {
        position: absolute;
        top: -24px;
        left: -2px;
        background: #0284c7;
        color: #ffffff;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
      }
      .inspect-card {
        position: fixed;
        width: 320px;
        background: #0f172a;
        color: #f8fafc;
        border-radius: 10px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
        padding: 12px;
        box-sizing: border-box;
        display: none;
        pointer-events: auto;
        font-size: 12px;
        line-height: 1.4;
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #334155;
        padding-bottom: 8px;
        margin-bottom: 8px;
      }
      .elem-title {
        font-weight: 700;
        color: #38bdf8;
        font-size: 13px;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dim-badge {
        font-size: 10px;
        color: #94a3b8;
        background: #1e293b;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .props-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-bottom: 10px;
      }
      .prop-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .prop-label {
        color: #94a3b8;
        font-size: 11px;
      }
      .prop-val {
        color: #e2e8f0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .color-dot {
        width: 10px;
        height: 10px;
        border-radius: 2px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        display: inline-block;
      }
      .btn-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 8px;
      }
      .action-btn {
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.15s ease;
        text-align: center;
      }
      .btn-tw {
        background: #0284c7;
        color: #ffffff;
      }
      .btn-tw:hover { background: #0369a1; }
      .btn-css {
        background: #334155;
        color: #f1f5f9;
      }
      .btn-css:hover { background: #475569; }
      .frozen-hint {
        font-size: 10px;
        color: #f59e0b;
        text-align: center;
        margin-top: 6px;
      }
    `;

    this.highlightBox = document.createElement('div');
    this.highlightBox.className = 'highlight-box';

    this.tagBadge = document.createElement('div');
    this.tagBadge.className = 'tag-badge';
    this.highlightBox.appendChild(this.tagBadge);

    this.card = document.createElement('div');
    this.card.className = 'inspect-card';

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.highlightBox);
    this.shadow.appendChild(this.card);
    document.documentElement.appendChild(this.host);
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.active || this.isFrozen) return;

    // 避开 overlay 本身
    const target = e.target as HTMLElement;
    if (!target || target === this.host || this.host?.contains(target)) return;

    this.currentElement = target;
    this.updateHighlight(target, e.clientX, e.clientY);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.active) return;

    if (e.code === 'Space') {
      e.preventDefault();
      this.isFrozen = !this.isFrozen;
      this.updateCard();
    } else if (e.key === 'Escape') {
      this.disable();
    }
  };

  private bindEvents() {
    window.addEventListener('mousemove', this.onMouseMove, true);
    window.addEventListener('keydown', this.onKeyDown, true);
  }

  private unbindEvents() {
    window.removeEventListener('mousemove', this.onMouseMove, true);
    window.removeEventListener('keydown', this.onKeyDown, true);
  }

  private updateHighlight(el: HTMLElement, mouseX: number, mouseY: number) {
    if (!this.highlightBox || !this.tagBadge || !this.card) return;

    const rect = el.getBoundingClientRect();
    this.currentStyles = extractElementStyles(el);

    // 高亮框定位
    this.highlightBox.style.left = `${rect.left}px`;
    this.highlightBox.style.top = `${rect.top}px`;
    this.highlightBox.style.width = `${rect.width}px`;
    this.highlightBox.style.height = `${rect.height}px`;
    this.highlightBox.style.display = 'block';

    const className = el.classList.length > 0 ? `.${el.classList[0]}` : '';
    this.tagBadge.textContent = `${el.tagName.toLowerCase()}${className} ${Math.round(rect.width)}×${Math.round(rect.height)}`;

    // 悬浮卡片定位（优先鼠标右下方，若超出屏幕则自适应翻转）
    const cardWidth = 320;
    const cardHeight = 240;
    let cardLeft = mouseX + 16;
    let cardTop = mouseY + 16;

    if (cardLeft + cardWidth > window.innerWidth - 10) {
      cardLeft = mouseX - cardWidth - 16;
    }
    if (cardTop + cardHeight > window.innerHeight - 10) {
      cardTop = mouseY - cardHeight - 16;
    }

    this.card.style.left = `${Math.max(10, cardLeft)}px`;
    this.card.style.top = `${Math.max(10, cardTop)}px`;
    this.card.style.display = 'block';

    this.updateCard();
  }

  private updateCard() {
    if (!this.card || !this.currentStyles) return;
    const s = this.currentStyles;

    this.card.innerHTML = `
      <div class="card-header">
        <span class="elem-title">&lt;${s.tagName}${s.idName}${s.classList.length ? '.' + s.classList.join('.') : ''}&gt;</span>
        <span class="dim-badge">${s.dimensions.width} × ${s.dimensions.height}</span>
      </div>

      <div class="props-list">
        <div class="prop-row">
          <span class="prop-label">${m.propFont}</span>
          <span class="prop-val">${s.fontSize} (${s.fontWeight}) · ${s.fontFamily}</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">${m.propColorBg}</span>
          <span class="prop-val">
            <span class="color-dot" style="background:${s.color}"></span>
            <span class="color-dot" style="background:${s.backgroundColor}"></span>
          </span>
        </div>
        <div class="prop-row">
          <span class="prop-label">${m.propPaddingRadius}</span>
          <span class="prop-val">${s.padding} · ${s.borderRadius}</span>
        </div>
        ${s.border !== 'none' ? `
        <div class="prop-row">
          <span class="prop-label">${m.propBorder}</span>
          <span class="prop-val">${s.border}</span>
        </div>` : ''}
      </div>

      <div class="btn-row">
        <button class="action-btn btn-tw" id="copy-tw">${m.copyTailwindBtn}</button>
        <button class="action-btn btn-css" id="copy-css">${m.copyCssBtn}</button>
      </div>

      <div class="frozen-hint">
        ${this.isFrozen ? m.hintFrozen : m.hintUnfrozen}
      </div>
    `;

    // 绑定复制事件
    const twBtn = this.card.querySelector('#copy-tw');
    const cssBtn = this.card.querySelector('#copy-css');

    twBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(s.tailwindClasses || '/* no tailwind classes */');
      twBtn.textContent = m.copiedTailwind;
      setTimeout(() => { if (twBtn) twBtn.textContent = m.copyTailwindBtn; }, 1200);
    });

    cssBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(s.rawCss || '/* no custom styles */');
      cssBtn.textContent = m.copiedCss;
      setTimeout(() => { if (cssBtn) cssBtn.textContent = m.copyCssBtn; }, 1200);
    });
  }

  private hide() {
    if (this.highlightBox) this.highlightBox.style.display = 'none';
    if (this.card) this.card.style.display = 'none';
  }
}
