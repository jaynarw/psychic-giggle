chrome.runtime.onInstalled.addListener((object) => {
  chrome.tabs.create({ url: 'https://www.bingebox.live' }, () => {
    console.log('Installed');
  });
});
