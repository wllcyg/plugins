export default defineBackground(() => {
  // 监听来自 Content Script 或 Popup 的截图与缩放请求
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_VISIBLE_TAB') {
      const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
      // 工业级自动重试：带指数退避，彻底化解 Chrome 底层 MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND 限流抛错
      const doCapture = (retry = 0) => {
        chrome.tabs.captureVisibleTab(
          windowId,
          { format: 'png' },
          (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
              const err = chrome.runtime.lastError?.message || 'Empty capture';
              if (retry < 4) {
                setTimeout(() => doCapture(retry + 1), 200 * (retry + 1));
              } else {
                console.error('[100Free Screenshot] captureVisibleTab 达到最大重试:', err);
                sendResponse({ success: false, error: err });
              }
            } else {
              sendResponse({ success: true, dataUrl });
            }
          }
        );
      };
      doCapture(0);
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
