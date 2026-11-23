export default defineBackground(() => {
  // 监听来自 Content Script 或 Popup 的截图请求
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
  });

  console.log('[100Free Screenshot] 后台截图调度中心已就绪');
});
