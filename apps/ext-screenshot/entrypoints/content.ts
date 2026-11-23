import { t } from '../src/utils/i18n';

interface ScreenShotSlice {
  y: number;
  dataUrl: string;
  sourceY: number; // 切片在当前视口中的起始 Y（处理最后一屏不满视口的重叠裁切）
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
          transition: opacity 0.1s ease;
          pointer-events: none;
        `;
        document.body.appendChild(indicatorEl);
      }
      indicatorEl.style.opacity = '1';
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

    // 拍照瞬间纯隐蔽自身进度条，杜绝把自身进度条截进画面
    const withInvisibleIndicator = async <T>(fn: () => Promise<T>): Promise<T> => {
      if (indicatorEl) indicatorEl.style.opacity = '0';
      // 强制微小等待确保 DOM 渲染层更新
      await new Promise((r) => setTimeout(r, 30));
      const result = await fn();
      if (indicatorEl) indicatorEl.style.opacity = '1';
      return result;
    };

    // 智能处理吸顶与吸底元素
    // 规则：吸顶元素在第二屏及以后隐藏；吸底元素除了最后一屏外全程隐藏
    const toggleFixedElements = (hideTop: boolean, hideBottom: boolean) => {
      const fixedEls = Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) => {
        if (el.id === '__100free_screenshot_indicator__') return false;
        const pos = window.getComputedStyle(el).position;
        return pos === 'fixed' || pos === 'sticky';
      });

      fixedEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const isNearBottom = rect.bottom > window.innerHeight - 80 && rect.top > window.innerHeight / 2;

        if (isNearBottom) {
          if (hideBottom) {
            el.dataset.screenshotOriginalOpacity = el.style.opacity || '1';
            el.style.opacity = '0';
          } else {
            el.style.opacity = el.dataset.screenshotOriginalOpacity || '';
          }
        } else {
          if (hideTop) {
            el.dataset.screenshotOriginalOpacity = el.style.opacity || '1';
            el.style.opacity = '0';
          } else {
            el.style.opacity = el.dataset.screenshotOriginalOpacity || '';
          }
        }
      });
    };

    // 拼接多屏并触发下载
    const stitchAndDownload = async (slices: ScreenShotSlice[], totalWidth: number, totalHeight: number, dpr: number) => {
      if (indicatorEl) {
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
            // 精确像素切片绘制（支持处理重叠裁剪）
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

          // 处理最后一屏不够一个整视口的高度的重叠情况
          if (isLastScreen && totalScreens > 1) {
            targetScrollY = fullHeight - viewportHeight;
            const overlap = (i * viewportHeight) - targetScrollY;
            sourceY = overlap;
            sourceHeight = viewportHeight - overlap;
          }

          window.scrollTo(0, targetScrollY);
          showProgress(i + 1, totalScreens);

          // 等待滚动停止与重绘
          await new Promise((r) => setTimeout(r, 220));

          // 智能剔除：非第一屏隐藏吸顶；非最后一屏隐藏吸底
          toggleFixedElements(!isFirstScreen, !isLastScreen);

          // 核心拍照瞬间：必须隐藏自身指示器
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

        // 彻底还原页面元素与滚动位置
        toggleFixedElements(false, false);
        window.scrollTo(originalScrollX, originalScrollY);

        // 图像无缝缝合与下载
        await stitchAndDownload(slices, viewportWidth, fullHeight, dpr);
      } catch (err) {
        console.error('[100Free Screenshot] 截屏异常:', err);
        toggleFixedElements(false, false);
        window.scrollTo(originalScrollX, originalScrollY);
        hideProgress();
      }
    };

    // 截取当前视口
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
