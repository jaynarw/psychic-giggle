importScripts('https://www.gstatic.com/firebasejs/7.18.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/7.18.0/firebase-messaging.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9/crypto-js.min.js');

// console.log(window);

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
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
firebase.initializeApp(firebaseConfig);
// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();
const channel = new BroadcastChannel('Bingebox-sw');

messaging.setBackgroundMessageHandler((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const messageReceiver = (event) => {
    console.log('Received from bg');
    const { data } = event;
    const { type, token } = data;
    const secretKey = token.slice('Bearer '.length);
    if (type === 'SET TOKEN') {
      channel.removeEventListener('message', messageReceiver);
      const title = CryptoJS.AES.decrypt(payload.data.title, secretKey).toString(CryptoJS.enc.Utf8);
      const body = CryptoJS.AES.decrypt(payload.data.body, secretKey).toString(CryptoJS.enc.Utf8);
      console.log({ title, body });
      if (title.slice(0, 'DecryptedBingeBox: '.length) === 'DecryptedBingeBox: '
      && body.slice(0, 'DecryptedBingeBox: '.length) === 'DecryptedBingeBox: ') {
        const notificationTitle = title.slice('DecryptedBingeBox: '.length);
        const notificationOptions = {
          body: body.slice('DecryptedBingeBox: '.length),
        };
        if (notificationTitle === 'Invitation') {
          const inviteData = JSON.parse(notificationOptions.body);
          notificationOptions.body = `${inviteData.from} invites you to watch ${inviteData.movie} on ${inviteData.provider}`;
          channel.postMessage({ type: 'INVITATION', body: inviteData });
        }
        self.registration.showNotification(notificationTitle,
          notificationOptions);
      }
    }
  };
  channel.addEventListener('message', messageReceiver);
  channel.postMessage({ type: 'GET TOKEN' });
});
console.log('THis is sw');
