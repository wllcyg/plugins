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

    // 创建优雅的滚动进度悬浮气泡
    const showProgress = (current: number, total: number) => {
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
      indicatorEl.innerHTML = `
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;animation:pulse 1s infinite;"></span>
        <span>${t('capturingProgress', [String(current), String(total)])}</span>
      `;
    };

    const hideProgress = () => {
      if (indicatorEl) {
        indicatorEl.remove();
        indicatorEl = null;
      }
    };

    // 拍照瞬间硬核隐藏自身进度条与所有其它插件浮动元素
    const withInvisibleIndicator = async <T>(fn: () => Promise<T>): Promise<T> => {
      if (indicatorEl) {
        indicatorEl.style.display = 'none';
      }
      // 临时隐藏其它插件的遮罩（例如表格插件的悬浮框）
      const otherOverlays = document.querySelectorAll<HTMLElement>('#__100free_table_overlay__');
      otherOverlays.forEach(el => el.style.display = 'none');

      // 使用 requestAnimationFrame 强行等待浏览器合成层将 display: none 渲染到位
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 60);
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

    // 拼接多屏并触发下载
    const stitchAndDownload = async (slices: ScreenShotSlice[], totalWidth: number, totalHeight: number, dpr: number) => {
      if (indicatorEl) {
        indicatorEl.style.display = 'flex';
        indicatorEl.innerHTML = `<span>⏳ ${t('stitching')}</span>`;
      }

      const canvas = document.createElement('canvas');
      canvas.width = totalWidth * dpr;
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
              totalWidth * dpr,
              slice.sourceHeight * dpr,
              0,
              slice.y * dpr,
              totalWidth * dpr,
              slice.sourceHeight * dpr
            );
            resolve();
          };
          img.src = slice.dataUrl;
        });
      }

      const finalUrl = canvas.toDataURL('image/png');
      const filename = `Screenshot_${document.title.replace(/[\\/:*?"<>|]/g, '_')}_${Date.now()}.png`;

      // 触发下载
      const anchor = document.createElement('a');
      anchor.href = finalUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      hideProgress();
    };

    // 核心自动滚动截屏引擎
    const startFullPageCapture = async () => {
      const originalScrollY = window.scrollY;
      const originalScrollX = window.scrollX;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const fullHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        viewportHeight
      );

      const dpr = window.devicePixelRatio || 1;
      const totalScreens = Math.ceil(fullHeight / viewportHeight);
      const slices: ScreenShotSlice[] = [];

      try {
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
          showProgress(i + 1, totalScreens);

          // 等待页面滚动静止
          await new Promise((r) => setTimeout(r, 200));

          // 智能吸顶与吸底元素显隐
          toggleFixedElements(!isFirstScreen, !isLastScreen);

          // 核心：强制 display: none 隐藏指示器，等待重绘后拍照
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

        // 彻底还原
        toggleFixedElements(false, false);
        window.scrollTo(originalScrollX, originalScrollY);

        // 拼接下载
        await stitchAndDownload(slices, viewportWidth, fullHeight, dpr);
      } catch (err) {
        console.error('[100Free Screenshot] 截屏异常:', err);
        toggleFixedElements(false, false);
        window.scrollTo(originalScrollX, originalScrollY);
        hideProgress();
      }
    };

    const captureVisibleOnly = async () => {
      const response = await withInvisibleIndicator(async () => {
        return await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
      });
      if (response?.success && response.dataUrl) {
        const anchor = document.createElement('a');
        anchor.href = response.dataUrl;
        anchor.download = `Screenshot_Visible_${Date.now()}.png`;
        anchor.click();
      }
    };

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'START_FULL_PAGE_CAPTURE') {
        startFullPageCapture();
        sendResponse({ success: true });
      } else if (message.type === 'CAPTURE_VISIBLE_ONLY') {
        captureVisibleOnly();
        sendResponse({ success: true });
      }
    });

    console.log('[100Free Screenshot] 智能长截图 Content Script 就绪');
  }
});
