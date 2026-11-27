import { defineBackground } from 'wxt/sandbox';
import { extractTargetUrl } from '../src/rules/redirect-rules';
import { cleanTrackingParams } from '../src/rules/tracking-rules';
import {
  getSettings,
  saveSettings,
  getStats,
  recordRedirect,
  recordCleanedParams
} from '../src/utils/storage';
import { m } from '../src/locales';

export default defineBackground(() => {
  // 1. 初始化右键菜单
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'clean_copy_link',
        title: m.menuCopyLink,
        contexts: ['link']
      });

      chrome.contextMenus.create({
        id: 'clean_copy_page_url',
        title: m.menuCopyPageUrl,
        contexts: ['page']
      });
    });
  });

  // 2. 右键菜单点击处理
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    let rawUrl = '';
    if (info.menuItemId === 'clean_copy_link' && info.linkUrl) {
      rawUrl = info.linkUrl;
    } else if (info.menuItemId === 'clean_copy_page_url' && info.pageUrl) {
      rawUrl = info.pageUrl;
    }

    if (!rawUrl) return;

    // 先检测是否为中转页包装
    let targetUrl = rawUrl;
    const redirectMatch = extractTargetUrl(rawUrl, true);
    if (redirectMatch && redirectMatch.targetUrl) {
      targetUrl = redirectMatch.targetUrl;
      await recordRedirect();
    }

    // 剔除所有追踪营销参数
    const cleaned = cleanTrackingParams(targetUrl);
    if (cleaned.removedCount > 0) {
      await recordCleanedParams(cleaned.removedCount);
    }

    const finalUrl = cleaned.cleanedUrl;

    // 写入剪贴板（在 tab 所在页面或 background 执行）
    if (tab?.id) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (url: string) => {
            navigator.clipboard.writeText(url);
          },
          args: [finalUrl]
        });

        // 提示用户
        chrome.tabs.sendMessage(tab.id, {
          type: 'SHOW_TOAST',
          text: m.toastBgCopied(cleaned.removedCount)
        }).catch(() => {});
      } catch {
        // fallback
      }
    }
  });

  // 3. 统一消息中心
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'RECORD_REDIRECT') {
      void recordRedirect().then(() => sendResponse({ success: true }));
      return true;
    }

    if (message.type === 'RECORD_CLEANED_PARAMS') {
      void recordCleanedParams(message.count || 1).then(() => sendResponse({ success: true }));
      return true;
    }

    if (message.type === 'GET_SETTINGS') {
      void getSettings().then((settings) => sendResponse({ settings }));
      return true;
    }

    if (message.type === 'SAVE_SETTINGS') {
      void saveSettings(message.settings).then((settings) => sendResponse({ settings }));
      return true;
    }

    if (message.type === 'GET_STATS') {
      void getStats().then((stats) => sendResponse({ stats }));
      return true;
    }

    if (message.type === 'PURIFY_URL') {
      let target = message.url || '';
      let isRedirect = false;
      let platformName: string | undefined;

      const redirectMatch = extractTargetUrl(target, true);
      if (redirectMatch && redirectMatch.targetUrl) {
        target = redirectMatch.targetUrl;
        isRedirect = true;
        platformName = redirectMatch.platformName;
      }

      const cleaned = cleanTrackingParams(target);
      sendResponse({
        originalUrl: message.url,
        cleanedUrl: cleaned.cleanedUrl,
        isRedirect,
        platformName,
        removedCount: cleaned.removedCount
      });
      return true;
    }
  });

  console.log('[100Free Clean Redirect] 后台服务就绪');
});
