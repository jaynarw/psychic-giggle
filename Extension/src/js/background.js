chrome.runtime.onInstalled.addListener((object) => {
  chrome.tabs.create({ url: 'https://www.bingebox.live' }, () => {
    console.log('Installed');
  });
});

chrome.runtime.onInstalled.addListener((details) => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: {
            hostContains: '.netflix.',
            pathPrefix: '/watch/',
            schemes: ['http', 'https'],
          },
        }),
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: {
            hostContains: '.primevideo.com',
            schemes: ['http', 'https'],
          },
        }),
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()],
    }]);
  });
  // chrome.pageAction.onClicked.addListener(() => {
  //   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  //     const currentTabURL = new URL(tabs[0].url);
  //     chrome.tabs.sendMessage(tabs[0].id, { type: 'existenceIs' }, (response) => {
  //       if (typeof response === 'undefined') {
  //         if (chrome.runtime.lastError) {
  //           chrome.tabs.executeScript({ file: 'js/scriptInjectedChecker.js' });
  //           if (currentTabURL.hostname.indexOf('.primevideo.') !== -1) {
  //             chrome.tabs.executeScript({ file: 'js/content.js' });
  //           } else if (currentTabURL.hostname.indexOf('.netflix.') !== -1) {
  //             chrome.tabs.executeScript({ file: 'js/contentNetflix.js' });
  //           }
  //         }
  //       } else if (response.type === 'pain') { /* Checks if content script is already injected */
  //         console.log('Already injected');
  //       } else {
  //         chrome.tabs.executeScript({ file: 'js/scriptInjectedChecker.js' });
  //         if (currentTabURL.hostname.indexOf('.primevideo.') !== -1) {
  //           chrome.tabs.executeScript({ file: 'js/content.js' });
  //         } else if (currentTabURL.hostname.indexOf('.netflix.') !== -1) {
  //           chrome.tabs.executeScript({ file: 'js/contentNetflix.js' });
  //         }
  //       }
  //     });
  //   });
  // });
});
