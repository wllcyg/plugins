import { defineBackground } from 'wxt/sandbox';
import { ExtensionStorage } from '@100free/core';
import { InspectorSettings, DEFAULT_SETTINGS, STORAGE_KEY } from '../src/types';

export default defineBackground(() => {
  const updateBadge = async (tabId: number, enabled: boolean) => {
    if (enabled) {
      chrome.action.setBadgeText({ tabId, text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#0284c7' });
    } else {
      chrome.action.setBadgeText({ tabId, text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#94a3b8' });
    }
  };

  // 监听 Tab 激活更新 Badge
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const settings = (await ExtensionStorage.get<InspectorSettings>(STORAGE_KEY, DEFAULT_SETTINGS)) || DEFAULT_SETTINGS;
    updateBadge(activeInfo.tabId, settings.enabled);
  });

  // 存储变动通知当前活动 Tab
  ExtensionStorage.watch<InspectorSettings>(STORAGE_KEY, async (newSettings) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      updateBadge(tab.id, newSettings?.enabled ?? true);
    }
  });
});
