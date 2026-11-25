import { extractTargetUrl } from '../src/rules/redirect-rules';
import { cleanTrackingParams } from '../src/rules/tracking-rules';
import { stripCopyrightNotice } from '../src/rules/copyright-rules';
import { getSettings } from '../src/utils/storage';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main() {
    const settings = await getSettings();

    // 1. 中转页即时拦截与秒级直达（document_start 阶段执行，彻底消除中转页白屏或提示等待）
    if (settings.autoRedirectEnabled) {
      const match = extractTargetUrl(window.location.href, settings.heuristicRedirectEnabled);
      if (match && match.targetUrl) {
        let finalTarget = match.targetUrl;
        if (settings.cleanTrackingEnabled) {
          const cleaned = cleanTrackingParams(finalTarget);
          finalTarget = cleaned.cleanedUrl;
          if (cleaned.removedCount > 0) {
            chrome.runtime.sendMessage({ type: 'RECORD_CLEANED_PARAMS', count: cleaned.removedCount }).catch(() => {});
          }
        }

        chrome.runtime.sendMessage({ type: 'RECORD_REDIRECT', platform: match.platformName }).catch(() => {});
        // 瞬间替换当前页面历史，避免产生回退死循环
        window.location.replace(finalTarget);
        return;
      }
    }

    // 2. 页面内链接预清理与点击就地直达
    const cleanLinkElement = (a: HTMLAnchorElement) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      let targetUrl = href;
      // 绝对化 URL 便于解析
      try {
        targetUrl = new URL(href, window.location.href).href;
      } catch {
        return;
      }

      let modified = false;

      // 如果启用了中转链接就地还原
      if (settings.preCleanLinksEnabled) {
        const redirectMatch = extractTargetUrl(targetUrl, settings.heuristicRedirectEnabled);
        if (redirectMatch && redirectMatch.targetUrl) {
          targetUrl = redirectMatch.targetUrl;
          modified = true;
        }
      }

      // 如果启用了追踪参数剔除
      if (settings.cleanTrackingEnabled) {
        const cleaned = cleanTrackingParams(targetUrl);
        if (cleaned.removedCount > 0) {
          targetUrl = cleaned.cleanedUrl;
          modified = true;
        }
      }

      if (modified && a.href !== targetUrl) {
        a.href = targetUrl;
        // 如果原本中转包含 target="_blank"，保持用户体验
        if (!a.getAttribute('target') && !a.href.startsWith(window.location.origin)) {
          a.setAttribute('rel', 'noopener noreferrer');
        }
      }
    };

    // 全局点击事件捕获（在任何链接被真正点击激活前，做最终一道秒级清洗）
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const anchor = target.closest('a') as HTMLAnchorElement | null;
        if (anchor) {
          cleanLinkElement(anchor);
        }
      },
      { capture: true, passive: true }
    );

    // 页面加载完成后扫描并观察动态追加的链接
    const initLinkObserver = () => {
      if (!settings.preCleanLinksEnabled && !settings.cleanTrackingEnabled) return;

      const scanBatch = () => {
        const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href]');
        anchors.forEach((a) => cleanLinkElement(a));
      };

      // 首次扫描
      scanBatch();

      // MutationObserver 轻量节流监听
      let timer: number | null = null;
      const observer = new MutationObserver(() => {
        if (timer) return;
        timer = window.setTimeout(() => {
          timer = null;
          scanBatch();
        }, 300);
      });

      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
          }
        });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initLinkObserver);
    } else {
      initLinkObserver();
    }

    // 3. 复制时剔除版权小尾巴
    if (settings.stripCopyCopyrightEnabled) {
      document.addEventListener('copy', (e: ClipboardEvent) => {
        const selection = document.getSelection();
        const selectedText = selection ? selection.toString() : '';
        if (!selectedText) return;

        const { cleanedText, stripped } = stripCopyrightNotice(selectedText);
        if (stripped && e.clipboardData) {
          e.preventDefault();
          e.clipboardData.setData('text/plain', cleanedText);
        }
      });
    }

    // 显示轻量 Toast 提示
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'SHOW_TOAST') {
        showToast(message.text);
        sendResponse({ success: true });
      }
    });

    const showToast = (text: string) => {
      let toast = document.getElementById('__100free_clean_toast__');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = '__100free_clean_toast__';
        toast.style.cssText = `
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 2147483647;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #f8fafc;
          padding: 10px 18px;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.15);
          pointer-events: none;
          transition: opacity 0.25s ease, transform 0.25s ease;
          opacity: 0;
          transform: translateY(10px);
        `;
        document.body.appendChild(toast);
      }
      toast.textContent = text;
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';

      setTimeout(() => {
        if (toast) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(10px)';
        }
      }, 2000);
    };
  }
});
