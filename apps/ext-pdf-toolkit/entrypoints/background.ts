import { defineBackground } from 'wxt/sandbox';
import { m } from '../src/locales';

const MENU_OPEN_PDF = 'open-in-pdf-toolkit';

function openStudioTab(params?: Record<string, string>) {
  const base = chrome.runtime.getURL('/studio.html');
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  void chrome.tabs.create({ url: `${base}${query}` });
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: MENU_OPEN_PDF,
      title: m.contextMenuTitle,
      contexts: ['link'],
      targetUrlPatterns: ['*://*/*.pdf*', '*://*/*.PDF*']
    });
  });

  chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === MENU_OPEN_PDF && info.linkUrl) {
      openStudioTab({ sourceUrl: info.linkUrl });
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'OPEN_STUDIO') {
      openStudioTab(msg.sourceUrl ? { sourceUrl: String(msg.sourceUrl) } : undefined);
      sendResponse({ ok: true });
      return true;
    }
  });
});
