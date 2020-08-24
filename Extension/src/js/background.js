/* eslint-disable no-console */
// import firebase from 'firebase';
import superagent from 'superagent';

chrome.runtime.onInstalled.addListener((object) => {
  chrome.tabs.create({ url: 'https://www.bingebox.live' }, () => {
    console.log('Installed');
  });
});

function sendTokenToServer(registrationToken) {
  console.log('sending token to sv');
  chrome.storage.local.get(['token'], (result) => {
    if (result.token) {
      console.log("Token found");
      superagent.post('https://0297f2e82338.ngrok.io/registerFCMToken')
        .send({
          registrationToken,
        })
        .set('Authorization', result.token).catch((err) => {
          console.error(err);
        });
    }
    console.log(`Got local storage ${result.token}`);
  });
}

const firebaseConfig = {
  apiKey: 'AIzaSyCB8NzQbcuYfH6wM4OEausiojv3R8JsPQ8',
  authDomain: 'binge-18543.firebaseapp.com',
  databaseURL: 'https://binge-18543.firebaseio.com',
  projectId: 'binge-18543',
  storageBucket: 'binge-18543.appspot.com',
  messagingSenderId: '850581673566',
  appId: '1:850581673566:web:e7dcbc3f0837594af5c6cf',
  measurementId: 'G-N8LEG7TLS9',
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();
messaging.usePublicVapidKey('BD40Qcq0ZKDtvvZkMgbctP4WmJW50puIzLyFLA7g6Agf8vNYHtyY6zZZ6j4m4YfJnKU-xxPtWOgQ0uIaMdStQ6U');

const channel = new BroadcastChannel('Bingebox-sw');
channel.addEventListener('message', (e) => {
  console.log('Received from sw');
  const { data } = e;
  if (data.type && data.type === 'GET TOKEN') {
    chrome.storage.local.get(['token'], (result) => {
      if (result.token) {
        channel.postMessage({ type: 'SET TOKEN', token: result.token });
      }
    });
  }
});

// messaging.requestPermission().then(() => {
//   console.log('Permission Granted');
// }).catch(() => {
//   console.log('Denied Permission');
// });
chrome.runtime.onMessage.addListener((req) => {
  if (req.type === 'LoggedIn') {
    console.log('Received LogIn');
    messaging.getToken()
      .then((token) => {
        console.log(token);
        sendTokenToServer(token);
      });
    console.log('Hi');

    messaging.onTokenRefresh(() => {
      messaging.getToken().then((refreshedToken) => {
        console.log('Token refreshed');
        sendTokenToServer(refreshedToken);
      }).catch((err) => {
        console.log('Unable to retrieve refreshed token ', err);
        showToken('Unable to retrieve refreshed token ', err);
      });
    });
    messaging.onMessage((payload) => {
      console.log(`Message received. ${JSON.stringify(payload)}`);
      // ...
    });
  }
});
