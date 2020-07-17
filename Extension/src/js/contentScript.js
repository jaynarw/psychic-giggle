import React from 'react';
import ReactDOM from 'react-dom';
import ChatBox from './components/ChatBox';

let playerSet;
let sdk;
let video;
let videoExists;
let nowPlaying = '';

const chatBoxContainer = document.createElement('div');
chatBoxContainer.id = 'psychic-giggler';

function check() {
  playerSet = document.getElementById('dv-web-player');
  if (playerSet) {
    videoExists = window.getComputedStyle(playerSet).display !== 'none';
    if (videoExists) {
      [sdk] = document.getElementsByClassName('webPlayerSDKContainer');
      if (sdk && !sdk.contains(chatBoxContainer)) {
        const nowPlayingElt = sdk.querySelector('.fgzdi7m.f10ip5t1.fs89ngr');
        const nowPlayingSecondaryElt = sdk.querySelector('div.f15586js.f1iodedr.fdm7v.fs89ngr');
        if (nowPlayingElt && nowPlayingSecondaryElt) nowPlaying = (nowPlayingElt.textContent + nowPlayingSecondaryElt.textContent);
        [video] = sdk.getElementsByTagName('video');
        if (video && nowPlaying.length > 0) {
          sdk.childNodes.forEach((elt) => {
            elt.style.setProperty('width', '80%', 'important');
          });
          sdk.appendChild(chatBoxContainer);
          ReactDOM.render(<ChatBox nowPlaying={nowPlaying} />, chatBoxContainer);
        }
      }
    } else if (sdk && sdk.contains(chatBoxContainer)) {
      ReactDOM.unmountComponentAtNode(chatBoxContainer);
      sdk.removeChild(chatBoxContainer);
      sdk.childNodes.forEach((elt) => {
        elt.style.setProperty('width', '100%', 'important');
      });
    }
  }
}

const config = { attribute: true, childList: true, subtree: true };
const obs = new MutationObserver(check);
obs.observe(document.body, config);
