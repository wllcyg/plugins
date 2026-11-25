import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: '100free-hl-selection',
      title: '🖍️ 荧光笔高亮选中文字',
      contexts: ['selection']
    });
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === '100free-hl-selection' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'HIGHLIGHT_SELECTION' }).catch(() => {});
    }
  });
});
