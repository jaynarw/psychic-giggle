chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTabURL = new URL(tabs[0].url);
  chrome.tabs.sendMessage(tabs[0].id, { type: 'existenceIs' }, (response) => {
    if (typeof response === 'undefined') {
      if (chrome.runtime.lastError) {
        chrome.tabs.executeScript({ file: 'js/scriptInjectedChecker.js' });
        if (currentTabURL.hostname.indexOf('.primevideo.') !== -1) {
          chrome.tabs.executeScript({ file: 'js/content.js' });
        } else if (currentTabURL.hostname.indexOf('.netflix.') !== -1) {
          chrome.tabs.executeScript({ file: 'js/contentNetflix.js' });
        }
      }
    } else if (response.type === 'pain') { /* Checks if content script is already injected */
      console.log('Already injected');
    } else {
      chrome.tabs.executeScript({ file: 'js/scriptInjectedChecker.js' });
      if (currentTabURL.hostname.indexOf('.primevideo.') !== -1) {
        chrome.tabs.executeScript({ file: 'js/content.js' });
      } else if (currentTabURL.hostname.indexOf('.netflix.') !== -1) {
        chrome.tabs.executeScript({ file: 'js/contentNetflix.js' });
      }
    }
  });
});

const darkButton = document.getElementById('dark');
const transButton = document.getElementById('transparent');

chrome.storage.local.get('theme', (result) => {
  console.log(result.theme);
  switch (result.theme) {
    case 'DARK':
      darkButton.checked = true;
      break;
    case 'TRANSPARENT':
      transButton.checked = true;
      break;
    default:
      // Do nothing
  }
});

function onChange(e) {
  chrome.storage.local.set({ theme: e.target.value });
}

darkButton.onchange = onChange;
transButton.onchange = onChange;
