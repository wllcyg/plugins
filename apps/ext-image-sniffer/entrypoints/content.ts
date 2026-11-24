import { defineContentScript } from 'wxt/sandbox';
import { scanPageImages } from '../src/core/scanner';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.action === 'SCAN_PAGE_IMAGES') {
          const images = scanPageImages();
          sendResponse({ images, pageTitle: document.title });
          return true;
        }
      });
    }
  }
});
