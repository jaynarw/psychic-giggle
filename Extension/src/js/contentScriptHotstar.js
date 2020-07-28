import React from 'react';
import ReactDOM from 'react-dom';
import ChatBox from './components/ChatBoxHotstar';

document.head.insertAdjacentHTML(
  'beforeend',
  '<link href="https://fonts.googleapis.com/css2?family=Righteous&display=swap" rel="stylesheet" />',
);

let playerSet; let
  playerSkin;
let videoExists;
const nowPlaying = '';

const chatBoxContainer = document.createElement('div');
chatBoxContainer.id = 'psychic-giggler';
chatBoxContainer.style.top = '0';
chatBoxContainer.style.zIndex = '999';

function check() {
  playerSet = document.querySelector('.player-base');
  if (playerSet) {
    videoExists = playerSet.querySelector('.player-node > video');
    playerSkin = playerSet.querySelector('.skin-overlay-container');
    if (videoExists && playerSkin) {
      if (!playerSet.contains(chatBoxContainer)) {
        // const nowPlayingElt = sdk.querySelector('.fgzdi7m.f10ip5t1.fs89ngr');
        // const nowPlayingSecondaryElt = sdk.querySelector('div.f15586js.f1iodedr.fdm7v.fs89ngr');
        // if (nowPlayingElt && nowPlayingSecondaryElt) nowPlaying = (nowPlayingElt.textContent + nowPlayingSecondaryElt.textContent);
        // [video] = sdk.getElementsByTagName('video');
        // if (videoExists && nowPlaying.length > 0) {
        window.addEventListener('keydown', (event) => {
          event.stopPropagation();
        }, true);
        playerSet.childNodes.forEach((elt) => {
          elt.style.setProperty('width', '80%', 'important');
        });
        playerSkin.style.setProperty('width', '80%', 'important');
        playerSet.appendChild(chatBoxContainer);
        ReactDOM.render(<ChatBox nowPlaying={nowPlaying} />, chatBoxContainer);
        // }
      }
    } else if (playerSet.contains(chatBoxContainer)) {
      ReactDOM.unmountComponentAtNode(chatBoxContainer);
      playerSet.removeChild(chatBoxContainer);
      playerSet.childNodes.forEach((elt) => {
        elt.style.setProperty('width', '100%', 'important');
      });
      playerSkin.style.setProperty('width', '100%', 'important');
    }
  }
}

const config = { attribute: true, childList: true, subtree: true };
const obs = new MutationObserver(check);
obs.observe(document.body, config);
