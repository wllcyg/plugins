import { defineBackground } from 'wxt/sandbox';
import { decodeImageUrl } from '../src/core/decoder';
import { m } from '../src/locales';

export default defineBackground(() => {
  // 安装时注册右键菜单
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'qr-master-decode-image',
        title: m.contextMenuDecode,
        contexts: ['image']
      });
    });
  });

  // 处理右键菜单点击
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'qr-master-decode-image' && info.srcUrl) {
      try {
        const result = await decodeImageUrl(info.srcUrl);
        if (result) {
          // 保存最新识别结果到 local storage
          await chrome.storage.local.set({
            latest_decoded_result: result,
            latest_decoded_source: info.srcUrl
          });

          // 如果识别出的是网址，且有对应权限，通知用户已识别
          chrome.action.setBadgeText({ text: '✓' });
          chrome.action.setBadgeBackgroundColor({ color: '#10B981' });

          setTimeout(() => {
            chrome.action.setBadgeText({ text: '' });
          }, 3500);

          // 自动弹出 action popup 或通知
          if (chrome.action.openPopup) {
            chrome.action.openPopup().catch(() => {});
          }
        } else {
          chrome.action.setBadgeText({ text: '×' });
          chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
          setTimeout(() => {
            chrome.action.setBadgeText({ text: '' });
          }, 2500);
        }
      } catch (err) {
        console.error('右键解码失败:', err);
      }
    }
  });
});
