const chatBox = document.createElement('div');
chatBox.className = 'chat-here';

let i = 0;
const inputTime = document.createElement('input');
inputTime.className = 'time-disp';

chatBox.appendChild(inputTime);

chatBox.style.backgroundColor = 'white';
chatBox.style.right = '0';

const playerSet = document.getElementById('dv-web-player');
console.log(playerSet);

let videoExists;
const config = { attributes: true };
let sdk;
let video;

const check = function() {
  if(MutationRecord.addedNodes) console.log(MutationRecord.addedNodes);
  videoExists = window.getComputedStyle(playerSet).display !== 'none';
  if (videoExists) {
    sdk = document.getElementsByClassName('webPlayerSDKContainer')[0];
    if(sdk) {
      console.log(sdk);
      sdk.childNodes.forEach ( (elt) => {
        elt.style.setProperty('width', '80%', 'important');
      });
      sdk.appendChild(chatBox);
      chatBox.style.position = 'fixed';
      chatBox.style.width = '20%';
      chatBox.style.height = '100%';
      video = document.getElementsByTagName('video')[0];
      if(video) {
        video.ontimeupdate = (event) => {
          console.log(i);
          inputTime.value = event.target.currentTime;
        };
      }
    }
  } else {
    console.log('ends');
    sdk.removeChild(chatBox);
    sdk.childNodes.forEach ( (elt1) => {
      elt1.style.setProperty('width', '100%', 'important');
    });
  }
};
const obs = new MutationObserver(check);

obs.observe(playerSet, config) ;
