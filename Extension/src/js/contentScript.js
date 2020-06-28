import React from 'react';
import ReactDOM from 'react-dom';
import ChatBox from './components/ChatBox';

let playerSet;
let sdk;
let cascadesContainer;
let video;
let videoExists;
let nowPlaying = '';
let searchPage = false;

const chatBoxContainer = document.createElement('div');
chatBoxContainer.id = 'psychic-giggler';

const url = new URL(window.location.href);
if (url.pathname.split('/')[1] === 'search') { searchPage = true; }


function check() {
  playerSet = document.getElementById('dv-web-player');
  if (playerSet) {
    videoExists = window.getComputedStyle(playerSet).display !== 'none';
    if (videoExists) {
      if (searchPage) {
        if (!cascadesContainer) [cascadesContainer] = playerSet.getElementsByClassName('cascadesContainer');
        if (cascadesContainer && !cascadesContainer.contains(chatBoxContainer)) {
          cascadesContainer.style.setProperty('width', '80%', 'important');
          cascadesContainer.appendChild(chatBoxContainer);
          ReactDOM.render(<ChatBox nowPlaying={nowPlaying} />, chatBoxContainer);
        }
      } else {
        [sdk] = document.getElementsByClassName('webPlayerSDKContainer');
        if (sdk && !sdk.contains(chatBoxContainer)) {
          const nowPlayingElt = sdk.querySelector('.fgzdi7m.f10ip5t1.fs89ngr');
          if (nowPlayingElt) nowPlaying = nowPlayingElt.textContent;
          [video] = sdk.getElementsByTagName('video');
          if (video && nowPlaying.length > 0) {
            sdk.childNodes.forEach((elt) => {
              elt.style.setProperty('width', '80%', 'important');
            });
            sdk.appendChild(chatBoxContainer);
            ReactDOM.render(<ChatBox nowPlaying={nowPlaying} />, chatBoxContainer);
          }
        }
      }
    } else if (!searchPage && sdk && sdk.contains(chatBoxContainer)) {
      ReactDOM.unmountComponentAtNode(chatBoxContainer);
      sdk.removeChild(chatBoxContainer);
      sdk.childNodes.forEach((elt) => {
        elt.style.setProperty('width', '100%', 'important');
      });
    } else if (searchPage && cascadesContainer && cascadesContainer.contains(chatBoxContainer)) {
      ReactDOM.unmountComponentAtNode(chatBoxContainer);
      cascadesContainer.removeChild(chatBoxContainer);
      cascadesContainer.style.setProperty('width', '100%');
    }
  }
}

const config = { attribute: true, childList: true, subtree: true };
const obs = new MutationObserver(check);
obs.observe(document.body, config);
