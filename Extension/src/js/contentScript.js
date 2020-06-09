const chatBox = document.createElement('div');
chatBox.className = 'chat-here';
chatBox.id = 'psychick';
chatBox.style.backgroundColor = 'white';
chatBox.style.right = '0';

const inputTime = document.createElement('input');
inputTime.className = 'time-disp';
chatBox.appendChild(inputTime);

const playerSet = document.getElementById('dv-web-player');
let sdk;
let video;
let videoExists;

function setTime(event) {
  inputTime.value = event.target.currentTime;
}

function check() {
  videoExists = window.getComputedStyle(playerSet).display !== 'none';
  if (videoExists) {
    [sdk] = document.getElementsByClassName('webPlayerSDKContainer');
    if (sdk && !sdk.contains(chatBox)) {
      [video] = sdk.getElementsByTagName('video');
      if (video) {
        sdk.childNodes.forEach((elt) => {
          elt.style.setProperty('width', '80%', 'important');
        });
        sdk.appendChild(chatBox);
        chatBox.style.position = 'fixed';
        chatBox.style.width = '20%';
        chatBox.style.height = '100%';
        video.addEventListener('timeupdate', setTime);
      }
    }
  } else if (sdk && sdk.contains(chatBox)) {
    if (video) {
      video.removeEventListener('timeupdate', setTime);
    }
    sdk.removeChild(chatBox);
    sdk.childNodes.forEach((elt) => {
      elt.style.setProperty('width', '100%', 'important');
    });
  }
}

const config = { attribute: true, childList: true, subtree: true };
const obs = new MutationObserver(check);
obs.observe(document.body, config);
