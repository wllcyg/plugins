export default defineBackground(() => {
  let isRecording = false;
  let isPaused = false;
  let recorderTabId: number | null = null;

  const broadcastState = () => {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (typeof tab.id !== 'number') continue;
        const tabId = tab.id;
        void chrome.tabs
          .sendMessage(tabId, {
            type: 'RECORDING_STATE_CHANGED',
            isRecording,
            isPaused
          })
          .catch(() => {
            if (isRecording && tab.url && /^https?:\/\//.test(tab.url)) {
              void chrome.scripting
                .executeScript({
                  target: { tabId },
                  files: ['content-scripts/content.js']
                })
                .catch(() => {});
            }
          });
      }
    });
  };

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === recorderTabId) {
      isRecording = false;
      isPaused = false;
      recorderTabId = null;
      broadcastState();
    }
  });

  chrome.commands.onCommand.addListener((command) => {
    if (command !== 'toggle-recording') return;
    if (isRecording && recorderTabId !== null) {
      void chrome.tabs.sendMessage(recorderTabId, { type: 'COMMAND_STOP_RECORDING' }).catch(() => {});
    } else {
      const url = new URL(chrome.runtime.getURL('studio.html'));
      url.searchParams.set('mode', 'record');
      url.searchParams.set('audio', '1');
      void chrome.tabs.create({ url: url.href }).then((tab) => {
        if (typeof tab.id === 'number') recorderTabId = tab.id;
      });
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message?.type) return;

    if (message.type === 'OPEN_STUDIO') {
      const openStudio = async () => {
        const url = new URL(chrome.runtime.getURL('studio.html'));
        if (message.mode) url.searchParams.set('mode', String(message.mode));
        if (message.projectId) url.searchParams.set('id', String(message.projectId));
        if (message.audio) url.searchParams.set('audio', '1');
        if (message.camera) url.searchParams.set('camera', '1');

        const tab = await chrome.tabs.create({ url: url.href });
        if (typeof tab.id === 'number') {
          recorderTabId = tab.id;
        }
      };
      void openStudio().then(
        () => sendResponse({ success: true }),
        () => sendResponse({ success: false })
      );
      return true;
    }

    if (message.type === 'SET_RECORDING_ACTIVE') {
      isRecording = Boolean(message.isRecording);
      isPaused = Boolean(message.isPaused);
      if (typeof sender.tab?.id === 'number') {
        recorderTabId = sender.tab.id;
      }
      broadcastState();
      sendResponse({ success: true });
      return;
    }

    if (message.type === 'GET_RECORDING_STATUS') {
      sendResponse({ isRecording, isPaused });
      return;
    }

    if (
      (message.type === 'CONTROL_TOGGLE_PAUSE' ||
        message.type === 'CONTROL_STOP_RECORDING') &&
      recorderTabId !== null
    ) {
      void chrome.tabs.sendMessage(recorderTabId, { type: message.type }).catch(() => {});
      return;
    }

    if (
      (message.type === 'RECORDING_CURSOR_MOVE' ||
        message.type === 'RECORDING_CLICK' ||
        message.type === 'RECORDING_KEYSTROKE' ||
        message.type === 'RECORDING_BOOKMARK') &&
      isRecording &&
      !isPaused &&
      recorderTabId !== null
    ) {
      void chrome.tabs.sendMessage(recorderTabId, message).catch(() => {});
    }
  });
});
