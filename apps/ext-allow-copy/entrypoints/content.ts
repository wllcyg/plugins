import { defineContentScript } from 'wxt/sandbox';
import { ExtensionStorage } from '@100free/core';
import { DomUnblocker } from '../src/core/unblocker';
import { FloatingCopyButton } from '../src/core/floating-action';
import { SnippingExtractor } from '../src/core/snipping';
import { CopySettings, DEFAULT_SETTINGS, STORAGE_KEY } from '../src/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    const unblocker = new DomUnblocker();
    const floatBtn = new FloatingCopyButton();
    const snipper = new SnippingExtractor();
    const currentHost = window.location.hostname;

    const applySettings = (settings: CopySettings) => {
      const siteExplicit = settings.siteRules?.[currentHost];
      const isEnabled = siteExplicit !== undefined ? siteExplicit : settings.enabled;

      if (isEnabled) {
        unblocker.enable(settings.strictMode);
        floatBtn.setEnabled(settings.showFloatButton);
      } else {
        unblocker.disable();
        floatBtn.setEnabled(false);
      }
    };

    // 初始化加载
    ExtensionStorage.get<CopySettings>(STORAGE_KEY, DEFAULT_SETTINGS).then((settings) => {
      applySettings(settings || DEFAULT_SETTINGS);
    });

    // 响应存储变动
    ExtensionStorage.watch<CopySettings>(STORAGE_KEY, (newSettings) => {
      if (newSettings) {
        applySettings(newSettings);
      }
    });

    // 接收消息指令
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.action === 'GET_PAGE_STATUS') {
          ExtensionStorage.get<CopySettings>(STORAGE_KEY, DEFAULT_SETTINGS).then((settings) => {
            const currentSettings = settings || DEFAULT_SETTINGS;
            const siteExplicit = currentSettings.siteRules?.[currentHost];
            const isEnabled = siteExplicit !== undefined ? siteExplicit : currentSettings.enabled;
            sendResponse({
              host: currentHost,
              isEnabled,
              strictMode: currentSettings.strictMode,
              showFloatButton: currentSettings.showFloatButton
            });
          });
          return true;
        }

        if (msg.action === 'START_SNIPPING') {
          snipper.start();
          sendResponse({ success: true });
          return true;
        }
      });
    }
  }
});
