import { defineBackground } from 'wxt/sandbox';
import { m } from '../src/locales';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: '100free-hl-selection',
      title: m.contextMenuHighlight,
      contexts: ['selection']
    });
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === '100free-hl-selection' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'HIGHLIGHT_SELECTION' }).catch(() => {});
    }
  });
});
