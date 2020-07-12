chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    switch (message.type) {
      case 'existenceIs': // Popup checks for content script, if Content script loaded reply back
        sendResponse({
          type: 'pain',
        });
        break;
      default:
        // Do nothing
    }
  },
);
