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
            html, body {
              scrollbar-width: none !important;
              -ms-overflow-style: none !important;
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

    // 智能处理吸顶与吸底元素
    const toggleFixedElements = (hideTop: boolean, hideBottom: boolean) => {
      const fixedEls = Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) => {
        if (el.id === '__100free_screenshot_indicator__' || el.id === '__100free_table_overlay__') return false;
        const pos = window.getComputedStyle(el).position;
        return pos === 'fixed' || pos === 'sticky';
      });

      fixedEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const isNearBottom = rect.bottom > window.innerHeight - 80 && rect.top > window.innerHeight / 2;

        if (isNearBottom) {
          if (hideBottom) {
            el.dataset.screenshotOriginalVisibility = el.style.visibility || '';
            el.style.visibility = 'hidden';
          } else {
            el.style.visibility = el.dataset.screenshotOriginalVisibility || '';
          }
        } else {
          if (hideTop) {
            el.dataset.screenshotOriginalVisibility = el.style.visibility || '';
            el.style.visibility = 'hidden';
          } else {
            el.style.visibility = el.dataset.screenshotOriginalVisibility || '';
          }
        }
      });
    };

    // 拼接多屏并触发下载（精确基于 clientWidth 绘制，剔除多余边距）
    const stitchAndDownload = async (
      slices: ScreenShotSlice[],
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
      canvas.width = contentWidth * dpr;
      canvas.height = totalHeight * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      for (const slice of slices) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(
              img,
              0,
              slice.sourceY * dpr,
              contentWidth * dpr,
              slice.sourceHeight * dpr,
              0,
              slice.y * dpr,
              contentWidth * dpr,
              slice.sourceHeight * dpr
            );
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

    // 核心自动滚动截屏引擎（支持 1x 标准与 2x 矢量级高清）
    const startFullPageCapture = async (options?: { hd?: boolean }) => {
      const isHd = !!options?.hd;
      const originalScrollY = window.scrollY;
      const originalScrollX = window.scrollX;
      let originalZoom: number | null = null;

      try {
        // 如果开启了高清模式，临时将当前 Tab 渲染缩放提升为 2.0x 矢量超清
        if (isHd) {
          const zoomRes = await chrome.runtime.sendMessage({ type: 'SET_TAB_ZOOM', zoom: 2.0 });
          if (zoomRes?.success && typeof zoomRes.originalZoom === 'number') {
            originalZoom = zoomRes.originalZoom;
          }
          await new Promise((r) => setTimeout(r, 120));
        }

        // 核心一：在截屏全程动态隐藏浏览器原生滚动条并等待样式生效
        await toggleScrollbars(true);

        // 隐藏滚动条后再读取视口与内容尺寸，确保无滚动条挤压误差
        const contentWidth = document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = window.innerHeight;
        const fullHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
          viewportHeight
        );

        const dpr = window.devicePixelRatio || 1;
        const totalScreens = Math.ceil(fullHeight / viewportHeight);
        const slices: ScreenShotSlice[] = [];

        for (let i = 0; i < totalScreens; i++) {
          const isFirstScreen = i === 0;
          const isLastScreen = i === totalScreens - 1;

          let targetScrollY = i * viewportHeight;
          let sourceY = 0;
          let sourceHeight = viewportHeight;

          if (isLastScreen && totalScreens > 1) {
            targetScrollY = fullHeight - viewportHeight;
            const overlap = (i * viewportHeight) - targetScrollY;
            sourceY = overlap;
            sourceHeight = viewportHeight - overlap;
          }

          window.scrollTo(0, targetScrollY);
          showProgress(i + 1, totalScreens, isHd);

          // 等待页面滚动静止
          await new Promise((r) => setTimeout(r, 200));

          // 智能吸顶与吸底元素显隐
          toggleFixedElements(!isFirstScreen, !isLastScreen);

          // 核心：强制隐藏指示器并拍照
          const response = await withInvisibleIndicator(async () => {
            return await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
          });

          if (response?.success && response.dataUrl) {
            slices.push({
              y: i * viewportHeight,
              dataUrl: response.dataUrl,
              sourceY,
              sourceHeight
            });
          }
        }

        // 拼接下载（只裁剪有效 contentWidth，杜绝任何滚动条边缘）
        await stitchAndDownload(slices, contentWidth, fullHeight, dpr, isHd);
      } catch (err) {
        console.error('[100Free Screenshot] 截屏异常:', err);
        hideProgress();
      } finally {
        // 彻底还原元素、滚动条、页面缩放与滚动位置
        toggleFixedElements(false, false);
        await toggleScrollbars(false);
        if (originalZoom !== null) {
          await chrome.runtime.sendMessage({ type: 'RESTORE_TAB_ZOOM', originalZoom });
        }
        window.scrollTo(originalScrollX, originalScrollY);
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
