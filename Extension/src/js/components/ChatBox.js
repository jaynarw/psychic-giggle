/* eslint-disable react/prop-types */
import React from 'react';
import * as io from 'socket.io-client';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import ReactTooltip from 'react-tooltip';
import { MdLastPage, MdFirstPage } from 'react-icons/md';
import { GiphyFetch } from '@giphy/js-fetch-api';
import Message from './Message';
import SendMessageForm from './SendMessageForm';
import LoginIllustration from './LoginIllustration';
import './chatbox.css';
import VoiceChatter from './VoiceChatter';

function typingStatusFromUsers(users) {
  if (users.length === 0) return '';
  return `${users.join(', ')} ${users.length > 1 ? 'are' : 'is'} typing...`;
}

class ChatBox extends React.Component {
  constructor(props) {
    super(props);
    const { nowPlaying } = this.props;
    this.state = {
      nowPlaying,
      currentVideo: null,
      othersConnected: false,
      currentSession: false,
      joinSession: '',
      nicknameInput: '',
      joinSessionInput: '',
      receivedMsgs: [],
      errorMsg: false,
      errorMsgJoin: false,
      isVisible: true,
      liveCalls: {},
      onlineUsers: [],
      typingUsers: [],
      notifications: 0,
    };
    this.socket = io('https://binge-box.herokuapp.com');
    this.gf = new GiphyFetch('lwiMnpcorQHdFIivZg43l3BJfJRlzdYO');
    this.play = true;
    this.pause = true;
    this.seeking = false;
    this.userSeeked = true;
    this.eventQueue = [];
    this.bufferCounter = 0;
    this.visible = true;
    this.queueManagerRunning = false;
    this.wasPlayingBeforeBuffer = null;
    this.typingTimeout = {};
    this.bufferObserver = null;

    this.handleVideoEvents = this.handleVideoEvents.bind(this);
  }

  componentDidMount() {
    const [sdk] = document.getElementsByClassName('webPlayerSDKContainer');
    const [buffer] = document.getElementsByClassName('f1la87wm');
    if (sdk) {
      const [video] = sdk.getElementsByTagName('video');
      if (video) {
        this.setState({ currentVideo: video });

        video.addEventListener('pause', this.handleVideoEvents);
        video.addEventListener('play', this.handleVideoEvents);
        video.addEventListener('seeked', this.handleVideoEvents);
        video.addEventListener('seeking', this.handleVideoEvents);
      }
    }

    this.bufferObserver = new MutationObserver(((mutations) => {
      mutations.forEach((mutationRecord) => {
        if (mutationRecord.target.style.display === 'none') {
          const { currentVideo } = { ...this.state };
          this.socket.emit('client sync', { type: 'BUFFER ENDED', paused: currentVideo.paused });
          console.log('Emiiting Buffer eneded');
        } else {
          this.socket.emit('client sync', { type: 'BUFFER STARTED' });
          console.log('Emiiting Buffer started');
        }
      });
    }));
    this.bufferObserver.observe(buffer, { attributes: true, attributeFilter: ['style'] });

    this.socket.on('update users list', (onlineUsers) => {
      this.setState({ onlineUsers });
    });

    this.socket.on('get-session', () => {
      const {
        currentSession, joinSessionInput, nicknameInput, nowPlaying,
      } = { ...this.state };
      if (currentSession && currentSession === joinSessionInput && nicknameInput && nowPlaying) {
        this.joinSessionHandler();
      }
    });

    this.socket.on('gif-msg-recieved', (gifMessage) => {
      const { receivedMsgs, notifications, isVisible } = { ...this.state };
      this.gf.gif(gifMessage.gifId).then((fetchedGif) => {
        const { data } = fetchedGif;
        receivedMsgs.unshift({
          from: gifMessage.from,
          gifData: data,
          nickname: gifMessage.nickname,
        });
        this.setState({ receivedMsgs });
        if (!isVisible) {
          this.setState({ notifications: notifications + 1 });
        }
      });
    });

    this.socket.on('msg-recieved', (data) => {
      const { receivedMsgs, notifications, isVisible } = { ...this.state };
      receivedMsgs.unshift(data);
      this.setState({ receivedMsgs });
      if (!isVisible) {
        this.setState({ notifications: notifications + 1 });
      }
    });
    this.socket.on('joined', (data) => {
      const { receivedMsgs } = { ...this.state };
      receivedMsgs.unshift({ joined: data });
      this.setState({ receivedMsgs });
    });
    this.socket.on('left', (data) => {
      const { receivedMsgs } = { ...this.state };
      receivedMsgs.unshift({ left: data });
      this.setState({ receivedMsgs });
    });
    this.socket.on('send time', () => {
      const { currentVideo } = { ...this.state };
      if (currentVideo) this.socket.emit('rec time', { time: currentVideo.currentTime, paused: currentVideo.paused });
    });
    this.socket.on('set time', (state) => {
      const { currentVideo } = { ...this.state };
      if (currentVideo) {
        // currentVideo.currentTime = state.time;
        if (state.paused !== currentVideo.paused) {
          if (state.paused) {
            this.eventQueue.push({ pause: true });
            // currentVideo.pause();
            this.performSync = false;
          } else {
            this.eventQueue.push({ play: true });
            // currentVideo.play();
            this.performSync = false;
          }
        }
        this.eventQueue.push({ timeUpdate: true, time: state.time });
      }
      if (!this.queueManagerRunning && this.eventQueue[0]) this.queueManager();
    });

    this.socket.on('typing', (nickname) => {
      const { typingUsers } = { ...this.state };

      if (!typingUsers.includes(nickname)) {
        typingUsers.push(nickname);
        this.setState({ typingUsers });

        const id = setTimeout(() => {
          const { typingUsers } = { ...this.state };
          this.setState({ typingUsers: typingUsers.filter((user) => user !== nickname) });
        }, 3000);
        this.typingTimeout[nickname] = id;
      } else {
        if (this.typingTimeout[nickname]) {
          clearTimeout(this.typingTimeout[nickname]);
        }

        const id = setTimeout(() => {
          const { typingUsers } = { ...this.state };
          this.setState({ typingUsers: typingUsers.filter((user) => user !== nickname) });
        }, 3000);
        this.typingTimeout[nickname] = id;
      }
    });

    this.socket.on('perform sync', (data) => {
      const { currentVideo, receivedMsgs } = { ...this.state };
      switch (data.type) {
        case 'PAUSE':
          console.log('Received pause');
          receivedMsgs.unshift({ status: 'PAUSE', nickname: data.nickname });
          this.setState({ receivedMsgs });
          this.eventQueue.push({ pause: true });
          // currentVideo.pause();
          break;
        case 'PLAY':
          console.log('Received play');
          receivedMsgs.unshift({ status: 'PLAY', nickname: data.nickname });
          this.setState({ receivedMsgs });
          this.eventQueue.push({ play: true });
          // currentVideo.play();
          break;
        case 'SEEKING':
          console.log('Received seeking');
          receivedMsgs.unshift({ status: 'SEEKING', nickname: data.nickname, time: data.value });
          this.setState({ receivedMsgs });
          this.eventQueue.push({ timeUpdate: true, time: data.value });
          // currentVideo.currentTime = data.value;
          break;
        case 'BUFFER STARTED':
          console.log('Received buffering start');
          receivedMsgs.unshift({ status: 'BUFFER', nickname: data.nickname });
          this.setState({ receivedMsgs });
          if (this.bufferCounter === 0) {
            // console.log('this will be state after buffer ends: ', currentVideo.paused ? 'paused' : 'play');
            // this.wasPlayingBeforeBuffer = !currentVideo.paused;
            // if (this.wasPlayingBeforeBuffer) {
            console.log('Others were buffering, we were playing, paused video insrted');
            this.eventQueue.push({ pause: true });
            // }
          }
          this.bufferCounter += 1;
          break;
        case 'BUFFER ENDED':
          console.log('Received buffering end');
          this.bufferCounter -= 1;
          // if (this.bufferCounter === 0 && this.wasPlayingBeforeBuffer) {
          //   this.eventQueue.push({ play: true });
          // }
          break;
        default:
          // do nothing
      }
      if (!this.queueManagerRunning && this.eventQueue[0]) this.queueManager();
    });
  }

  componentWillUnmount() {
    const { currentVideo } = { ...this.state };
    if (currentVideo) {
      currentVideo.removeEventListener('pause', this.handleVideoEvents);
      currentVideo.removeEventListener('play', this.handleVideoEvents);
      currentVideo.removeEventListener('seeked', this.handleVideoEvents);
      currentVideo.removeEventListener('seeking', this.handleVideoEvents);
    }
    if (this.bufferObserver) {
      this.bufferObserver.disconnect();
      this.bufferObserver = null;
    }
    this.socket.disconnect();
  }

  pauseVideo(target) {
    let date = new Date();
    console.log(date.toLocaleTimeString(), 'Pause event started');
    this.pause = false;
    target.pause();
    date = new Date();
    console.log(date.toLocaleTimeString(), 'Pause event ended');
    this.eventQueue.shift();
    this.queueManager();
  }

  seekVideo(target, time) {
    this.userSeeked = false;
    const seek = (tr, ti, state) => new Promise((resolve) => {
      const fn = () => {
        tr.removeEventListener('seeked', fn);
        resolve();
      };
      tr.addEventListener('seeked', fn);
      tr.currentTime = ti;
      if (state) {
        console.log('Video was paused before seeking');
        // this.eventQueue.push({ play: true }, { pause: true });
        // if (!this.queueManagerRunning && this.eventQueue[0]) this.queueManager();
        this.play = false;
        console.log('In seekVideo, this.play:', this.play);
        tr.play().then(() => {
          this.pause = false;
          tr.pause();
        }).catch(() => {
          this.pause = false;
          tr.pause();
        });
      } else {
        console.log('Video was playing before seeking');
      }
    });
    let date = new Date();
    console.log(date.toLocaleTimeString(), 'Seek event started');
    seek(target, time, target.paused).then(() => {
      date = new Date();
      console.log(date.toLocaleTimeString(), 'Seek event ended');
      this.eventQueue.shift();
      this.queueManager();
    });
  }

  playVideo(target) {
    const date = new Date();
    console.log(date.toLocaleTimeString(), 'Play event started');
    this.play = false;
    console.log('In playVideo, this.play:', this.play);
    target.play().then(() => {
      this.eventQueue.shift();
      const date = new Date();
      console.log(date.toLocaleTimeString(), 'Play event ended');
      this.queueManager();
    }).catch(() => {
      this.eventQueue.shift();
      const date = new Date();
      console.log(date.toLocaleTimeString(), 'Play event ended');
      this.queueManager();
    });
  }

  queueManager() {
    if (this.eventQueue[0]) {
      const date = new Date();
      console.log(date.toLocaleTimeString(), 'Queue manager running ', [...this.eventQueue]);
      const event = this.eventQueue[0];
      this.queueManagerRunning = true;
      const { currentVideo } = { ...this.state };
      if (event.pause) {
        this.pauseVideo(currentVideo);
      } else if (event.play) {
        this.playVideo(currentVideo);
      } else if (event.timeUpdate) {
        this.seekVideo(currentVideo, this.eventQueue[0].time, this.eventQueue[0].paused);
      }
    } else {
      const date = new Date();
      console.log(date.toLocaleTimeString(), 'Queue manager finished ', [...this.eventQueue]);
      this.queueManagerRunning = false;
    }
  }

  handleVideoEvents(event) {
    const { currentVideo } = { ...this.state };
    switch (event.type) {
      case 'pause':
        if (this.pause) {
          if (currentVideo.readyState === 4) {
            console.log('emitting pause');
            this.socket.emit('client sync', { type: 'PAUSE' });
          }
        } else {
          console.log('Not emitting pause because: Code did pause');
          this.pause = true;
        }
        break;
      case 'play':
        if (this.play) {
          if (this.bufferCounter > 0) {
            console.log('Not emitting play because: Others are buffering');
            this.eventQueue.push({ pause: true });
            if (!this.queueManagerRunning && this.eventQueue[0]) this.queueManager();
          } else if (currentVideo.readyState === 4) {
            console.log('emitting play');
            this.socket.emit('client sync', { type: 'PLAY' });
          }
        } else {
          console.log('Not emitting play because: Code did play');
          this.play = true;
          console.log('In handleVideoEvents, this.play:', this.play);
        }
        // if (this.bufferCounter > 0) {
        //   console.log('Not emitting play', this.bufferCounter);
        //   currentVideo.pause();
        // } else if (this.play && currentVideo.readyState === 4) {
        //   console.log('emitting play');
        //   this.socket.emit('client sync', { type: 'PLAY' });
        // } else {
        //   console.log('Not emitting play because: ', { bc: this.bufferCounter, playVar: this.play, readyState: currentVideo.readyState });
        //   this.play = true;
        // }
        break;
      case 'seeked':
        if (this.seeking) {
          this.seeking = false;
        }
        break;
      case 'seeking':
        if (this.seeking !== currentVideo.currentTime) {
          this.seeking = currentVideo.currentTime;
          if (this.userSeeked) {
            console.log('emitting seeking');
            this.socket.emit('client sync', { type: 'SEEKING', value: currentVideo.currentTime });
          } else {
            console.log('Not emitting seeked because: Code seeked');
          }
          this.userSeeked = true;
        }
        break;
      default:
        // do nothing
    }
  }

  displayError(errorMsg) {
    this.setState({ errorMsg });
  }

  createSession(event) {
    const { nicknameInput, nowPlaying } = { ...this.state };
    this.socket.emit('create session', nicknameInput, nowPlaying, (data) => {
      if (data.success) {
        this.setState({ currentSession: data.session, errorMsg: false });
      } else {
        this.displayError(data.error);
      }
    });
  }

  handleChange(event) {
    const { target } = event;
    const { value, name } = target;
    this.setState({ [name]: value });
  }

  joinSessionHandler(event) {
    const { joinSessionInput, nicknameInput, nowPlaying } = { ...this.state };
    this.socket.emit('join session', joinSessionInput, nicknameInput, nowPlaying, (data) => {
      if (data.success) {
        this.socket.emit('sync time');
        this.setState({ currentSession: joinSessionInput, errorMsgJoin: false, errorMsg: false });
      } else if (data.error1) this.setState({ errorMsgJoin: data.error1 });
      else if (data.error2) this.displayError(data.error2);
    });
  }

  showHide() {
    const { isVisible } = { ...this.state };
    const [sdk] = document.getElementsByClassName('webPlayerSDKContainer');
    if (isVisible) {
      sdk.childNodes.forEach((elt) => {
        elt.style.setProperty('width', '100%', 'important');
      });
      document.getElementById('psychic-giggler').style.width = '0%';
      setTimeout(() => { this.setState({ isVisible: false }); }, 200);
    } else {
      sdk.childNodes.forEach((elt) => {
        elt.style.setProperty('width', '80%', 'important');
      });
      document.getElementById('psychic-giggler').style.width = '20%';
      setTimeout(() => { this.setState({ isVisible: true }); }, 200);
      this.setState({ notifications: 0 });
    }
  }

  updateLiveCalls(liveCalls) {
    // this.liveCalls = liveCalls;
    this.setState({ liveCalls });
  }

  render() {
    const {
      currentSession,
      receivedMsgs,
      nicknameInput,
      errorMsg,
      errorMsgJoin,
      joinSessionInput,
      isVisible,
      liveCalls,
      onlineUsers,
      typingUsers,
      notifications,
    } = { ...this.state };
    const popcornBg = chrome.runtime.getURL('img/popkaun-bg.png');
    return (
      <>
        {/* <ReactTooltip place="left" type="light" /> */}
        { !isVisible
        && (
          <>
            <div
              className={`show-hide-button ${notifications > 0 ? 'background-popcorn white-text' : ''}`}
              data-tip="Show chat"
              onClick={() => this.showHide()}
              style={{
                top: `${document.getElementById('collapse-chat').getBoundingClientRect().y}px`,
                backgroundImage: notifications > 0 ? `url('${popcornBg}')` : '',
              }}
            >
              {notifications === 0 && <MdFirstPage style={{ width: '100%', height: '100%' }} />}
              {notifications > 0 && (notifications >= 10 ? '9+' : `${notifications}`) }
            </div>
            <ReactTooltip place="left" type="light" />
          </>
        )}
        <div id="psychick" className={`${currentSession ? '' : 'session-form-enabled'}`}>
          {!currentSession && (
          <>
            <LoginIllustration />
            <div className="card-psychic">
              <form
                className="session-form"
                id="nickname-form"
                autoComplete="off"
                onSubmit={(e) => { e.preventDefault(); return false; }}
              >
                {/* <label htmlFor="username-input" className={errorMsg ? 'nickname-error' : ''}>{`Set your Nickname${errorMsg ? ` - ${errorMsg}` : ''}`}</label> */}
                <label htmlFor="username-input" className={errorMsg ? 'nickname-error' : ''}>
                  Set your Nickname
                  {errorMsg && <span className="error-desc">{` - ${errorMsg}`}</span>}
                </label>
                <input
                  id="username-input"
                  name="nicknameInput"
                  onChange={(e) => this.handleChange(e)}
                  className="username-input"
                  value={nicknameInput}
                />
              </form>
            </div>
            <div className="card-psychic" style={{ padding: '10% 5%' }}>
              <button type="button" className="session-button" onClick={(e) => this.createSession(e)}>Create Session</button>
              <div className="or-divider">Or</div>
              <label htmlFor="join-session-input" className={errorMsgJoin ? 'nickname-error' : ''}>
                Enter Watch session ID
                {errorMsgJoin && <span className="error-desc">{` - ${errorMsgJoin}`}</span>}
              </label>
              <input
                id="join-session-input"
                name="joinSessionInput"
                onChange={(e) => this.handleChange(e)}
                className="username-input"
                value={joinSessionInput}
                style={{ marginBottom: '8px' }}
              />
              <button type="button" className="session-button" onClick={(e) => this.joinSessionHandler(e)}>Join Session</button>
            </div>
          </>
          )}
          {currentSession && (
          <>
            <div className="card-psychic session-header">
              <div style={{ display: 'flex' }}>
                <div id="collapse-chat" className="collapse-btn" onClick={() => this.showHide()}>
                  <MdLastPage style={{ width: '100%', height: '100%' }} />
                </div>
                <CopyToClipboard text={currentSession}>
                  <div className="username-input" id="copy-session">
                    Share your session ID -
                    {' '}
                    {currentSession}
                  </div>
                </CopyToClipboard>
              </div>
            </div>
            <div className="card-psychic session-header" style={{ gridRow: 2 }}>
              <VoiceChatter socket={this.socket} onlineUsers={onlineUsers} liveCalls={liveCalls} updateLiveCalls={(calls) => this.updateLiveCalls(calls)} />
            </div>
            <div id="chat-message-list">
              {receivedMsgs.map((messageData) => <Message username={nicknameInput} messageData={messageData} userId={this.socket.id} />)}
            </div>
            <div className="typing-status">
              <span>{typingStatusFromUsers(typingUsers)}</span>
            </div>
            <SendMessageForm socket={this.socket} />
          </>
          ) }
        </div>
      </>
    );
  }
}
export default ChatBox;
