chrome.runtime.onInstalled.addListener((object) => {
  chrome.tabs.create({ url: 'https://binge-box.herokuapp.com' }, () => {
    console.log('Installed');
  });
});
