import React from 'react';
import ReactDOM from 'react-dom';
import ChatBox from './components/ChatBoxNetflix';

const chatBoxContainer = document.createElement('div');
chatBoxContainer.id = 'psychic-giggler';
chatBoxContainer.style.zIndex = '9';
chatBoxContainer.style.top = '0';

const url = new URL(window.location.href);
const prefix = url.pathname.split('/')[1];
const videoPlayerContainer = document.querySelector('.NFPlayer.nf-player-container');
if (prefix === 'watch' && videoPlayerContainer) {
  videoPlayerContainer.style.setProperty('width', '80%', 'important');
}

function check() {
  const url = new URL(window.location.href);
  const prefix = url.pathname.split('/')[1];
  if (prefix === 'watch') {
    const videoPlayerContainer = document.querySelector('.NFPlayer.nf-player-container');
    const nowPlayingElt = videoPlayerContainer.querySelector('.video-title');
    const sizingWrapper = document.querySelector('.sizing-wrapper');
    if (videoPlayerContainer
      && nowPlayingElt
      && nowPlayingElt.textContent.length > 0
      && document.getElementsByTagName('video').length === 1
      && !sizingWrapper.contains(chatBoxContainer)) {
      videoPlayerContainer.style.setProperty('width', '80%', 'important');
      sizingWrapper.appendChild(chatBoxContainer);
      ReactDOM.render(<ChatBox nowPlaying={nowPlayingElt.textContent} />, chatBoxContainer);
    }
  } else {
    ReactDOM.unmountComponentAtNode(chatBoxContainer);
  }
}

check();
const config = { attribute: false, childList: true, subtree: true };
const obs = new MutationObserver(check);
obs.observe(document.body, config);
