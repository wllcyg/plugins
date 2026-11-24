import { defineBackground } from 'wxt/sandbox';
import { ExtensionStorage } from '@100free/core';
import { CopySettings, DEFAULT_SETTINGS, STORAGE_KEY } from '../src/types';

export default defineBackground(() => {
  const updateBadge = async (tabId: number, url?: string) => {
    if (!url || !url.startsWith('http')) {
      chrome.action.setBadgeText({ tabId, text: '' });
      return;
    }

    try {
      const hostname = new URL(url).hostname;
      const settings = (await ExtensionStorage.get<CopySettings>(STORAGE_KEY, DEFAULT_SETTINGS)) || DEFAULT_SETTINGS;
      const siteExplicit = settings.siteRules?.[hostname];
      const isEnabled = siteExplicit !== undefined ? siteExplicit : settings.enabled;

      if (isEnabled) {
        chrome.action.setBadgeText({ tabId, text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ tabId, color: '#2563eb' });
      } else {
        chrome.action.setBadgeText({ tabId, text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ tabId, color: '#94a3b8' });
      }
    } catch {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  };

  // 监听 Tab 激活与更新
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab?.id && tab.url) {
      updateBadge(tab.id, tab.url);
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      updateBadge(tabId, tab.url);
    }
  });

  // 监听存储变动更新当前活动 Tab
  ExtensionStorage.watch<CopySettings>(STORAGE_KEY, async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id && activeTab.url) {
      updateBadge(activeTab.id, activeTab.url);
    }
  });
});
