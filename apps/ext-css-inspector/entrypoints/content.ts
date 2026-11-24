import { defineContentScript } from 'wxt/sandbox';
import { ExtensionStorage } from '@100free/core';
import { InspectorOverlay } from '../src/core/overlay';
import { InspectorSettings, DEFAULT_SETTINGS, STORAGE_KEY } from '../src/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    const overlay = new InspectorOverlay();

    const applySettings = (settings: InspectorSettings) => {
      if (settings.enabled) {
        overlay.enable();
      } else {
        overlay.disable();
      }
    };

    ExtensionStorage.get<InspectorSettings>(STORAGE_KEY, DEFAULT_SETTINGS).then((settings) => {
      applySettings(settings || DEFAULT_SETTINGS);
    });

    ExtensionStorage.watch<InspectorSettings>(STORAGE_KEY, (newSettings) => {
      if (newSettings) {
        applySettings(newSettings);
      }
    });

    // 监听运行时消息
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.action === 'TOGGLE_INSPECTOR') {
          ExtensionStorage.get<InspectorSettings>(STORAGE_KEY, DEFAULT_SETTINGS).then((settings) => {
            const next = !settings?.enabled;
            ExtensionStorage.set(STORAGE_KEY, { ...(settings || DEFAULT_SETTINGS), enabled: next });
            sendResponse({ enabled: next });
          });
          return true;
        }
      });
    }
  }
});
