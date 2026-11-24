import { defineContentScript } from 'wxt/sandbox';
import { VideoControllerManager } from '../src/core/controller';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  matchAboutBlank: true,
  runAt: 'document_start',
  main() {
    const manager = new VideoControllerManager();

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.action === 'GET_VIDEO_STATE') {
          manager.scanVideos();
          sendResponse({
            hasVideo: manager.hasVideo(),
            videoCount: manager.getVideoCount(),
            settings: manager.getSettings(),
            isPiP: !!document.pictureInPictureElement
          });
          return true;
        }

        if (msg.action === 'UPDATE_SETTINGS') {
          manager.updateSettings(msg.settings);
          sendResponse({ success: true, settings: manager.getSettings() });
          return true;
        }

        if (msg.action === 'TOGGLE_PIP') {
          manager.togglePiP().then((active) => {
            sendResponse({ success: true, isPiP: active });
          });
          return true;
        }

        if (msg.action === 'CAPTURE_FRAME') {
          const res = manager.captureFrame();
          sendResponse({ success: !!res });
          return true;
        }
      });
    }
  }
});
