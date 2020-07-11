chrome.runtime.onInstalled.addListener((object) => {
  chrome.tabs.create({ url: 'https://bingebox.live' }, () => {
    console.log('Installed');
  });
});
