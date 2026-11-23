import { t } from '../src/utils/i18n';

interface ScreenShotSlice {
  y: number;
  dataUrl: string;
  sourceY: number;
  sourceHeight: number;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    let indicatorEl: HTMLElement | null = null;
    let scrollbarStyleEl: HTMLStyleElement | null = null;

    // 创建优雅的滚动进度悬浮气泡
    const showProgress = (current: number, total: number, isHd = false) => {
      if (!indicatorEl) {
        indicatorEl = document.createElement('div');
        indicatorEl.id = '__100free_screenshot_indicator__';
        indicatorEl.style.cssText = `
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 2147483647;
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #f8fafc;
          padding: 10px 18px;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          pointer-events: none;
        `;
        document.body.appendChild(indicatorEl);
      }
      indicatorEl.style.display = 'flex';
      const label = isHd
        ? `💎 正在进行 2x 高清整页截图: 第 ${current}/${total} 屏...`
        : t('capturingProgress', [String(current), String(total)]);
      indicatorEl.innerHTML = `
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;animation:pulse 1s infinite;"></span>
        <span>${label}</span>
      `;
    };

    const hideProgress = () => {
      if (indicatorEl) {
        indicatorEl.remove();
        indicatorEl = null;
      }
    };

    // 智能隐藏与恢复浏览器原生滚动条（杜绝长截图右侧出现多段滚动条碎片）
    const toggleScrollbars = async (hide: boolean) => {
      if (hide) {
        if (!scrollbarStyleEl) {
          scrollbarStyleEl = document.createElement('style');
          scrollbarStyleEl.id = '__100free_hide_scrollbars__';
          scrollbarStyleEl.textContent = `
            html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
            }
            html, body, * {
              scrollbar-width: none !important;
              -ms-overflow-style: none !important;
              scroll-behavior: auto !important;
            }
          `;
          document.head.appendChild(scrollbarStyleEl);
          // 等待一帧让渲染引擎消化隐藏滚动条的样式
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              setTimeout(resolve, 30);
            });
          });
        }
      } else {
        if (scrollbarStyleEl) {
          scrollbarStyleEl.remove();
          scrollbarStyleEl = null;
        }
      }
    };

    // 拍照瞬间硬核隐藏自身进度条与所有其它插件浮动元素
    const withInvisibleIndicator = async <T>(fn: () => Promise<T>): Promise<T> => {
      if (indicatorEl) {
        indicatorEl.style.display = 'none';
      }
      // 临时隐藏其它插件的遮罩（例如表格插件的悬浮框）
      const otherOverlays = document.querySelectorAll<HTMLElement>('#__100free_table_overlay__');
      otherOverlays.forEach((el) => {
        el.style.display = 'none';
      });

      // 强制等待浏览器合成层将 display: none 渲染到位
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 50);
        });
      });

      const result = await fn();

      if (indicatorEl) {
        indicatorEl.style.display = 'flex';
      }
      return result;
    };

    // 智能处理吸顶与吸底元素（精准识别全局顶部栏与底部挂件，绝不误伤正文业务组件）
    const toggleFixedElements = (hideTop: boolean, hideBottom: boolean) => {
      const allFixed = Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) => {
        if (el.id === '__100free_screenshot_indicator__' || el.id === '__100free_table_overlay__') return false;
        const pos = window.getComputedStyle(el).position;
        return pos === 'fixed';
      });

      allFixed.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // 只有紧贴视口顶部且高度适中的全局导航栏才算吸顶栏
        const isHeader = rect.top <= 10 && rect.height <= 140 && rect.width >= window.innerWidth * 0.5;
        // 只有紧贴视口底部的挂件才算吸底栏
        const isFooter = rect.bottom >= window.innerHeight - 30 && rect.top > window.innerHeight / 2;

        if (isHeader) {
          if (hideTop) {
            el.dataset.screenshotOriginalVisibility = el.style.visibility || '';
            el.style.visibility = 'hidden';
          } else {
            el.style.visibility = el.dataset.screenshotOriginalVisibility || '';
          }
        } else if (isFooter) {
          if (hideBottom) {
            el.dataset.screenshotOriginalVisibility = el.style.visibility || '';
            el.style.visibility = 'hidden';
          } else {
            el.style.visibility = el.dataset.screenshotOriginalVisibility || '';
          }
        }
      });
    };

    // 拼接多屏并触发下载（工业级增量缝合，按实际像素步进严丝合缝）
    const stitchAndDownload = async (
      slices: { dataUrl: string; sourceY: number; drawHeight: number }[],
      contentWidth: number,
      totalHeight: number,
      dpr: number,
      isHd = false
    ) => {
      if (indicatorEl) {
        indicatorEl.style.display = 'flex';
        indicatorEl.innerHTML = `<span>⏳ ${t('stitching')}</span>`;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(contentWidth * dpr);
      canvas.height = Math.round(totalHeight * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let currentDrawY = 0;
      for (const slice of slices) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(
              img,
              0,
              Math.round(slice.sourceY * dpr),
              Math.round(contentWidth * dpr),
              Math.round(slice.drawHeight * dpr),
              0,
              Math.round(currentDrawY * dpr),
              Math.round(contentWidth * dpr),
              Math.round(slice.drawHeight * dpr)
            );
            currentDrawY += slice.drawHeight;
            resolve();
          };
          img.src = slice.dataUrl;
        });
      }

      const finalUrl = canvas.toDataURL('image/png');
      const filename = `Screenshot_${isHd ? 'HD_2x_' : ''}${document.title.replace(/[\\/:*?"<>|]/g, '_')}_${Date.now()}.png`;

      // 触发下载
      const anchor = document.createElement('a');
      anchor.href = finalUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      hideProgress();
    };

    // 工业级自动滚动截屏引擎（基于真实滚动增量追加，杜绝断裂、留白与重复）
    const startFullPageCapture = async (options?: { hd?: boolean }) => {
      const isHd = !!options?.hd;
      const originalScrollY = window.scrollY;
      const originalScrollX = window.scrollX;
      let originalZoom: number | null = null;

      try {
        if (isHd) {
          const zoomRes = await chrome.runtime.sendMessage({ type: 'SET_TAB_ZOOM', zoom: 2.0 });
          if (zoomRes?.success && typeof zoomRes.originalZoom === 'number') {
            originalZoom = zoomRes.originalZoom;
          }
          await new Promise((r) => setTimeout(r, 150));
        }

        // 核心：在截屏全程动态隐藏浏览器原生滚动条并强制禁用平滑滚动
        await toggleScrollbars(true);

        const contentWidth = document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;

        // 先滚到最顶部起始点
        window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 100));

        let currentScrollY = window.scrollY;
        let screenIndex = 0;
        const slices: { dataUrl: string; sourceY: number; drawHeight: number }[] = [];
        let accumulatedHeight = 0;

        // 最大保护步数（防止极端死循环页面）
        const MAX_STEPS = 60;

        while (screenIndex < MAX_STEPS) {
          const isFirstScreen = screenIndex === 0;

          // 吸顶与吸底状态控制：非第一屏隐藏吸顶；只要还能往下滚就隐藏吸底
          toggleFixedElements(!isFirstScreen, true);

          showProgress(screenIndex + 1, Math.max(screenIndex + 1, Math.ceil(document.documentElement.scrollHeight / viewportHeight)), isHd);

          // 核心：强制隐藏自身指示器并抓取当前视口
          const response = await withInvisibleIndicator(async () => {
            return await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
          });

          if (!response?.success || !response.dataUrl) {
            console.error('[100Free Screenshot] 视口捕获失败');
            break;
          }

          if (isFirstScreen) {
            // 第一屏：完整使用当前视口高度
            slices.push({
              dataUrl: response.dataUrl,
              sourceY: 0,
              drawHeight: viewportHeight
            });
            accumulatedHeight += viewportHeight;
          }

          // 计算尝试滚动的下一个目标
          const targetY = currentScrollY + viewportHeight;
          window.scrollTo({ left: 0, top: targetY, behavior: 'instant' });

          // 等待滚动瞬时完成与 DOM 稳定
          await new Promise((r) => setTimeout(r, 220));

          const newScrollY = window.scrollY;
          const actualDelta = newScrollY - currentScrollY;

          // 如果滚动位置没有发生任何位移，说明已经触碰页面物理最底部！
          if (actualDelta <= 1) {
            // 如果只有一屏，第一屏已经添加，直接结束
            break;
          }

          // 抓取新露出的增量内容
          // 增量实际位移是 actualDelta，新内容位于当前视口底部的 actualDelta 区域
          currentScrollY = newScrollY;
          screenIndex++;

          // 如果这是最后一屏（已经滚到底部，恢复吸底元素呈现）
          const isAtBottom = currentScrollY + viewportHeight >= document.documentElement.scrollHeight - 2;
          toggleFixedElements(true, !isAtBottom);

          // 再次抓取移动后的视口
          const nextResponse = await withInvisibleIndicator(async () => {
            return await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
          });

          if (nextResponse?.success && nextResponse.dataUrl) {
            // 源图像只裁取底部新露出的 actualDelta 高度
            const sourceY = Math.max(0, viewportHeight - actualDelta);
            slices.push({
              dataUrl: nextResponse.dataUrl,
              sourceY,
              drawHeight: actualDelta
            });
            accumulatedHeight += actualDelta;
          }

          if (isAtBottom) {
            break;
          }
        }

        // 最终拼接并下载
        await stitchAndDownload(slices, contentWidth, accumulatedHeight, dpr, isHd);
      } catch (err) {
        console.error('[100Free Screenshot] 截屏异常:', err);
        hideProgress();
      } finally {
        toggleFixedElements(false, false);
        await toggleScrollbars(false);
        if (originalZoom !== null) {
          await chrome.runtime.sendMessage({ type: 'RESTORE_TAB_ZOOM', originalZoom });
        }
        window.scrollTo({ left: originalScrollX, top: originalScrollY, behavior: 'instant' });
      }
    };

    const captureVisibleOnly = async () => {
      await toggleScrollbars(true);
      const contentWidth = document.documentElement.clientWidth || window.innerWidth;
      const contentHeight = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      const response = await withInvisibleIndicator(async () => {
        return await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
      });

      await toggleScrollbars(false);

      if (response?.success && response.dataUrl) {
        // 如果有微小滚动条留存，裁切掉右侧多余像素
        const canvas = document.createElement('canvas');
        canvas.width = contentWidth * dpr;
        canvas.height = contentHeight * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, contentWidth * dpr, contentHeight * dpr, 0, 0, contentWidth * dpr, contentHeight * dpr);
            const finalUrl = canvas.toDataURL('image/png');
            const anchor = document.createElement('a');
            anchor.href = finalUrl;
            anchor.download = `Screenshot_Visible_${Date.now()}.png`;
            anchor.click();
          };
          img.src = response.dataUrl;
        }
      }
    };

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'START_FULL_PAGE_CAPTURE') {
        startFullPageCapture({ hd: !!message.hd });
        sendResponse({ success: true });
      } else if (message.type === 'CAPTURE_VISIBLE_ONLY') {
        captureVisibleOnly();
        sendResponse({ success: true });
      }
    });

    console.log('[100Free Screenshot] 智能长截图 Content Script 就绪');
  }
});
