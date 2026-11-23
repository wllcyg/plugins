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

    // 拼接多屏并触发下载（严丝合缝像素无缝缝合）
    const stitchAndDownload = async (
      slices: { dataUrl: string; sourceY: number; drawHeight: number; destY: number }[],
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
              Math.round(slice.destY * dpr),
              Math.round(contentWidth * dpr),
              Math.round(slice.drawHeight * dpr)
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

    // 工业级稳健自动滚动截屏引擎（严密坐标网格 + 完整视口覆盖）
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

        // 核心：隐藏滚动条并禁用平滑滚动
        await toggleScrollbars(true);

        // 先回到最顶部
        window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 100));

        const contentWidth = document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = window.innerHeight;
        const fullHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
          document.documentElement.offsetHeight,
          document.body.offsetHeight,
          viewportHeight
        );
        const dpr = window.devicePixelRatio || 1;

        // 构建绝对平整的步进目标点序列
        const targetYPositions: number[] = [];
        let curY = 0;
        while (curY + viewportHeight < fullHeight) {
          targetYPositions.push(curY);
          curY += viewportHeight;
        }
        // 压入最后一屏物理底端目标
        const lastScrollY = Math.max(0, fullHeight - viewportHeight);
        if (targetYPositions.length === 0 || targetYPositions[targetYPositions.length - 1] !== lastScrollY) {
          targetYPositions.push(lastScrollY);
        }

        const totalSteps = targetYPositions.length;
        const slices: { dataUrl: string; sourceY: number; drawHeight: number; destY: number }[] = [];

        for (let idx = 0; idx < totalSteps; idx++) {
          const targetY = targetYPositions[idx];
          const isFirst = idx === 0;
          const isLast = idx === totalSteps - 1;

          // 瞬间滚动到目标坐标
          window.scrollTo({ left: 0, top: targetY, behavior: 'instant' });
          document.documentElement.scrollTop = targetY;
          document.body.scrollTop = targetY;

          showProgress(idx + 1, totalSteps, isHd);

          // 给予足够时间保证样式和图片完成重排与渲染，并避开速率限制
          await new Promise((r) => setTimeout(r, 320));

          // 吸顶与吸底控制
          toggleFixedElements(!isFirst, !isLast);

          // 核心拍照（带重试保障）
          let response = await withInvisibleIndicator(async () => {
            return await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
          });

          // 如果初次请求失败，额外等待 250ms 重新抓取一次
          if (!response?.success || !response.dataUrl) {
            await new Promise((r) => setTimeout(r, 250));
            response = await withInvisibleIndicator(async () => {
              return await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
            });
          }

          if (!response?.success || !response.dataUrl) {
            console.error(`[100Free Screenshot] 第 ${idx + 1} 屏捕获失败:`, response?.error || '无图像数据');
            continue;
          }

          if (isFirst && totalSteps === 1) {
            // 单屏全览
            slices.push({
              dataUrl: response.dataUrl,
              sourceY: 0,
              drawHeight: fullHeight,
              destY: 0
            });
          } else if (idx < totalSteps - 1) {
            // 前置各完整屏幕
            slices.push({
              dataUrl: response.dataUrl,
              sourceY: 0,
              drawHeight: viewportHeight,
              destY: idx * viewportHeight
            });
          } else {
            // 最后一屏：补齐剩余的高度差，严丝合缝
            const drawnSoFar = (totalSteps - 1) * viewportHeight;
            const remainingHeight = fullHeight - drawnSoFar;
            if (remainingHeight > 0) {
              const sourceY = Math.max(0, viewportHeight - remainingHeight);
              slices.push({
                dataUrl: response.dataUrl,
                sourceY,
                drawHeight: remainingHeight,
                destY: drawnSoFar
              });
            }
          }
        }

        // 最终拼接并触发下载
        await stitchAndDownload(slices, contentWidth, fullHeight, dpr, isHd);
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
