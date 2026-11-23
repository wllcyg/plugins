export default defineBackground(() => {
  // 监听来自 Content Script 或 Popup 的截图与缩放请求
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_VISIBLE_TAB') {
      // 利用 Chrome 官方 API 高清捕获当前可视窗口
      chrome.tabs.captureVisibleTab(
        sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT,
        { format: 'png' },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true, dataUrl });
          }
        }
      );
      return true; // 保持异步消息通道
    }

    // 动态设置缩放（实现 2x 高清整页截图，无需多余危险权限）
    if (message.type === 'SET_TAB_ZOOM') {
      const tabId = sender.tab?.id;
      if (tabId) {
        chrome.tabs.getZoom(tabId, (originalZoom) => {
          chrome.tabs.setZoom(tabId, message.zoom, () => {
            sendResponse({ success: true, originalZoom });
          });
        });
        return true;
      }
    }

    // 恢复原缩放比例
    if (message.type === 'RESTORE_TAB_ZOOM') {
      const tabId = sender.tab?.id;
      if (tabId && typeof message.originalZoom === 'number') {
        chrome.tabs.setZoom(tabId, message.originalZoom, () => {
          sendResponse({ success: true });
        });
        return true;
      }
    }
  });

  console.log('[100Free Screenshot] 后台截图调度中心已就绪');
});
