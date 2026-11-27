import { VideoSettings, DEFAULT_SETTINGS } from '../types';
import { injectAntiPause } from './anti-pause';
import { audioBooster } from './audio-booster';
import { m } from '../locales';

export class VideoControllerManager {
  private settings: VideoSettings = { ...DEFAULT_SETTINGS };
  private videos = new Set<HTMLVideoElement>();
  private osdMap = new WeakMap<HTMLVideoElement, HTMLElement>();
  private observer: MutationObserver | null = null;
  private isHooked = false;

  constructor() {
    this.init();
  }

  public async init() {
    // 从 storage 读取用户偏好
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const stored = await chrome.storage.local.get('video_master_settings');
        if (stored?.video_master_settings) {
          this.settings = { ...DEFAULT_SETTINGS, ...stored.video_master_settings };
        }
      }
    } catch {}

    // 如果开启了后台防暂停，尽早注入拦截
    if (this.settings.antiPause) {
      injectAntiPause();
    }

    // 扫描页面所有视频
    this.scanVideos();

    // 观察 DOM 变化，自动识别后续动态加载或换集的视频
    this.startObserver();

    // 绑定全局键盘快捷键
    this.bindShortcuts();

    // 锁定原型链倍速（防恶意脚本强制重置为 1.0）
    this.hookMediaPrototype();
  }

  public updateSettings(newSettings: Partial<VideoSettings>) {
    this.settings = { ...this.settings, ...newSettings };

    // 保存到 storage
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ video_master_settings: this.settings });
      }
    } catch {}

    if (newSettings.antiPause) {
      injectAntiPause();
    }

    if (typeof newSettings.playbackRate === 'number') {
      this.applyRateToAll(this.settings.playbackRate);
    }

    if (typeof newSettings.volumeBoost === 'number') {
      this.applyVolumeBoostToAll(this.settings.volumeBoost);
    }

    if (typeof newSettings.showOsdBadge === 'boolean') {
      this.updateOsdVisibility(this.settings.showOsdBadge);
    }
  }

  public getSettings(): VideoSettings {
    return { ...this.settings };
  }

  public getVideoCount(): number {
    return this.videos.size;
  }

  public hasVideo(): boolean {
    return this.videos.size > 0;
  }

  /**
   * 扫描当前 frame 中的所有 video 元素
   */
  public scanVideos() {
    const list = Array.from(document.querySelectorAll<HTMLVideoElement>('video'));
    list.forEach((v) => this.registerVideo(v));
  }

  private registerVideo(video: HTMLVideoElement) {
    if (this.videos.has(video)) return;
    this.videos.add(video);

    // 首次注册应用当前设定倍速与音量
    if (this.settings.playbackRate !== 1.0) {
      video.playbackRate = this.settings.playbackRate;
    }
    if (this.settings.volumeBoost > 1.0) {
      audioBooster.setBoost(video, this.settings.volumeBoost);
    }

    // 监听播放开始事件，再次确保倍速应用
    video.addEventListener('play', () => {
      video.playbackRate = this.settings.playbackRate;
    });

    // 创建或附着浮动 OSD 控制卡片
    if (this.settings.showOsdBadge) {
      this.attachOsd(video);
    }

    // 监听节点移除
    video.addEventListener('emptied', () => {
      if (!document.contains(video)) {
        this.unregisterVideo(video);
      }
    });
  }

  private unregisterVideo(video: HTMLVideoElement) {
    this.videos.delete(video);
    const osd = this.osdMap.get(video);
    if (osd) {
      osd.remove();
      this.osdMap.delete(video);
    }
  }

  private startObserver() {
    if (this.observer) return;
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLVideoElement) {
            this.registerVideo(node);
          } else if (node instanceof HTMLElement) {
            const nested = node.querySelectorAll<HTMLVideoElement>('video');
            nested.forEach((v) => this.registerVideo(v));
          }
        });
      }
    });

    this.observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 原型链反篡改锁：防止某些网课防作弊脚本定时重置 playbackRate
   */
  private hookMediaPrototype() {
    if (this.isHooked) return;
    this.isHooked = true;

    const self = this;
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
    if (!originalDescriptor || !originalDescriptor.set || !originalDescriptor.get) return;

    Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
      get() {
        return originalDescriptor.get!.call(this);
      },
      set(val: number) {
        // 如果插件指定了非 1.0 倍速，且页面脚本试图强行将其设为 1.0，拦截并保持插件倍速
        if (self.settings.playbackRate !== 1.0 && val === 1.0) {
          originalDescriptor.set!.call(this, self.settings.playbackRate);
        } else {
          originalDescriptor.set!.call(this, val);
        }
      },
      configurable: true
    });
  }

  /**
   * 应用倍速到全页面所有视频
   */
  public applyRateToAll(rate: number) {
    this.settings.playbackRate = Math.max(0.1, Math.min(16.0, parseFloat(rate.toFixed(2))));
    this.videos.forEach((v) => {
      try {
        v.playbackRate = this.settings.playbackRate;
      } catch {}
      this.updateOsdText(v);
    });
  }

  /**
   * 应用音量增益放大
   */
  public applyVolumeBoostToAll(ratio: number) {
    this.settings.volumeBoost = ratio;
    this.videos.forEach((v) => {
      audioBooster.setBoost(v, ratio);
    });
  }

  /**
   * 切换画中画 (Picture-in-Picture)
   */
  public async togglePiP(): Promise<boolean> {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return false;
      }

      // 优先取正在播放的视频，否则取第一个视频
      const targetVideo =
        Array.from(this.videos).find((v) => !v.paused) || Array.from(this.videos)[0];

      if (targetVideo) {
        await targetVideo.requestPictureInPicture();
        return true;
      }
    } catch (err) {
      console.warn('[VideoMaster] Toggle PiP failed:', err);
    }
    return false;
  }

  /**
   * 原画高清帧截图
   */
  public captureFrame(targetVideo?: HTMLVideoElement): string | null {
    const video = targetVideo || Array.from(this.videos).find((v) => !v.paused) || Array.from(this.videos)[0];
    if (!video || !video.videoWidth) return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png', 1.0);

      // 触发下载
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeTitle = (document.title || 'video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
      a.download = `${safeTitle}_${Math.floor(video.currentTime)}s.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      return dataUrl;
    } catch (err) {
      console.warn('[VideoMaster] Capture frame failed (CORS or canvas error):', err);
      return null;
    }
  }

  /**
   * 附着半透明浮动胶囊 OSD
   */
  private attachOsd(video: HTMLVideoElement) {
    if (this.osdMap.has(video)) return;

    const osd = document.createElement('div');
    osd.className = '__100free_video_osd';
    osd.innerHTML = `
      <div class="osd-pill" title="${m.osdBrandTitle}">
        <span class="osd-icon">⚡</span>
        <span class="osd-rate">${this.settings.playbackRate.toFixed(2)}x</span>
        <div class="osd-menu">
          <button class="osd-btn osd-slow" title="${m.osdSlowTitle}">-</button>
          <button class="osd-btn osd-reset" title="${m.osdResetTitle}">1x</button>
          <button class="osd-btn osd-fast" title="${m.osdFastTitle}">+</button>
          <button class="osd-btn osd-pip" title="${m.osdPipTitle}">⧉</button>
          <button class="osd-btn osd-shot" title="${m.osdShotTitle}">📷</button>
        </div>
      </div>
    `;

    // 注入内置独立 scoped 样式
    this.ensureOsdStyle();

    // 绑定事件
    const btnSlow = osd.querySelector('.osd-slow');
    const btnReset = osd.querySelector('.osd-reset');
    const btnFast = osd.querySelector('.osd-fast');
    const btnPiP = osd.querySelector('.osd-pip');
    const btnShot = osd.querySelector('.osd-shot');

    btnSlow?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.applyRateToAll(this.settings.playbackRate - 0.25);
    });

    btnReset?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.applyRateToAll(1.0);
    });

    btnFast?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.applyRateToAll(this.settings.playbackRate + 0.25);
    });

    btnPiP?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePiP();
    });

    btnShot?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.captureFrame(video);
    });

    // 定位在父容器或直接插入到视频上层
    const parent = video.parentElement || document.body;
    if (parent) {
      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(osd);
      this.osdMap.set(video, osd);
    }
  }

  private updateOsdText(video: HTMLVideoElement) {
    const osd = this.osdMap.get(video);
    if (!osd) return;
    const rateEl = osd.querySelector('.osd-rate');
    if (rateEl) {
      rateEl.textContent = `${this.settings.playbackRate.toFixed(2)}x`;
    }
  }

  private updateOsdVisibility(visible: boolean) {
    this.videos.forEach((v) => {
      const osd = this.osdMap.get(v);
      if (osd) {
        osd.style.display = visible ? 'flex' : 'none';
      } else if (visible) {
        this.attachOsd(v);
      }
    });
  }

  private ensureOsdStyle() {
    if (document.getElementById('__100free_video_osd_style')) return;
    const style = document.createElement('style');
    style.id = '__100free_video_osd_style';
    style.textContent = `
      .__100free_video_osd {
        position: absolute;
        top: 14px;
        left: 14px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        user-select: none;
      }
      .__100free_video_osd .osd-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(15, 23, 42, 0.85);
        color: #ffffff;
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(8px);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
      }
      .__100free_video_osd:hover .osd-pill {
        background: rgba(15, 23, 42, 0.95);
        border-color: #8b5cf6;
      }
      .__100free_video_osd .osd-icon {
        color: #fbbf24;
        font-size: 13px;
      }
      .__100free_video_osd .osd-rate {
        color: #a78bfa;
        font-family: ui-monospace, SFMono-Regular, monospace;
      }
      .__100free_video_osd .osd-menu {
        display: none;
        align-items: center;
        gap: 4px;
        margin-left: 4px;
        border-left: 1px solid rgba(255, 255, 255, 0.2);
        padding-left: 6px;
      }
      .__100free_video_osd:hover .osd-menu {
        display: inline-flex;
      }
      .__100free_video_osd .osd-btn {
        background: rgba(255, 255, 255, 0.15);
        border: none;
        color: #ffffff;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 6px;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .__100free_video_osd .osd-btn:hover {
        background: #8b5cf6;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  /**
   * 全局快捷键监听
   */
  private bindShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (!this.settings.shortcutsEnabled) return;

      // 如果当前焦点处于输入框/富文本区域，不触发快捷键
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'd') {
        // D: 加速 +0.25x
        e.preventDefault();
        this.applyRateToAll(this.settings.playbackRate + 0.25);
      } else if (key === 's') {
        // S: 减速 -0.25x
        e.preventDefault();
        this.applyRateToAll(this.settings.playbackRate - 0.25);
      } else if (key === 'r') {
        // R: 恢复 1.0x 常速
        e.preventDefault();
        this.applyRateToAll(1.0);
      } else if (key === 'z') {
        // Z: 快退 5秒
        e.preventDefault();
        this.videos.forEach((v) => {
          v.currentTime = Math.max(0, v.currentTime - 5);
        });
      } else if (key === 'x') {
        // X: 快进 5秒
        e.preventDefault();
        this.videos.forEach((v) => {
          v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 5);
        });
      } else if (key === 'c') {
        // C: 画中画
        e.preventDefault();
        this.togglePiP();
      } else if (key === 'p') {
        // P: 截图
        e.preventDefault();
        this.captureFrame();
      }
    });
  }
}
