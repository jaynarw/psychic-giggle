import React from 'react';
import ReactDOM from 'react-dom';
import ChatBox from './components/ChatBoxNetflix';

// let playerSet;
// let sdk;
// let video;
// let videoExists;
// let nowPlaying = '';

const chatBoxContainer = document.createElement('div');
chatBoxContainer.id = 'psychic-giggler';
chatBoxContainer.style.zIndex = '9';
chatBoxContainer.style.top = '0';

const videoPlayerContainer = document.querySelector('.NFPlayer.nf-player-container');
if (videoPlayerContainer) {
  console.log('HI');
  videoPlayerContainer.style.setProperty('width', '80%', 'important');
}

function check() {
  const url = new URL(window.location.href);
  const prefix = url.pathname.split('/')[1];
  if (prefix === 'watch') {
    const videoPlayerContainer = document.querySelector('.NFPlayer.nf-player-container');
    const sizingWrapper = document.querySelector('.sizing-wrapper');
    if (videoPlayerContainer && !sizingWrapper.contains(chatBoxContainer)) {
      videoPlayerContainer.style.setProperty('width', '80%', 'important');
      sizingWrapper.appendChild(chatBoxContainer);
      ReactDOM.render(<ChatBox nowPlaying="nowPlaying" />, chatBoxContainer);
    }
  } else {
    // document.querySelector('.sizing-wrapper').appendChild(chatBoxContainer);
    // ReactDOM.render(<ChatBox nowPlaying="nowPlaying" />, chatBoxContainer);
    ReactDOM.unmountComponentAtNode(chatBoxContainer);
  }
}


const config = { attribute: false, childList: true, subtree: true };
const obs = new MutationObserver(check);
obs.observe(document.body, config);

// window.addEventListener('popstate', (e) => {
//   console.log(e.state);
// });

// function check() {
//   playerSet = document.getElementById('dv-web-player');
//   if (playerSet) {
//     videoExists = window.getComputedStyle(playerSet).display !== 'none';
//     if (videoExists) {
//       [sdk] = document.getElementsByClassName('webPlayerSDKContainer');
//       if (sdk && !sdk.contains(chatBoxContainer)) {
//         const nowPlayingElt = sdk.querySelector('.fgzdi7m.f10ip5t1.fs89ngr');
//         if (nowPlayingElt) nowPlaying = nowPlayingElt.textContent;
//         [video] = sdk.getElementsByTagName('video');
//         if (video && nowPlaying.length > 0) {
//           sdk.childNodes.forEach((elt) => {
//             elt.style.setProperty('width', '80%', 'important');
//           });
//           sdk.appendChild(chatBoxContainer);
//           ReactDOM.render(<ChatBox nowPlaying={nowPlaying} />, chatBoxContainer);
//         }
//       }
//     } else if (sdk && sdk.contains(chatBoxContainer)) {
//       ReactDOM.unmountComponentAtNode(chatBoxContainer);
//       sdk.removeChild(chatBoxContainer);
//       sdk.childNodes.forEach((elt) => {
//         elt.style.setProperty('width', '100%', 'important');
//       });
//     }
//   }
// }

// const config = { attribute: true, childList: true, subtree: true };
// const obs = new MutationObserver(check);
// obs.observe(document.body, config);
