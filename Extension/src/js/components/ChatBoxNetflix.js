/* eslint-disable react/prop-types */
import React from 'react';
import * as io from 'socket.io-client';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import ReactTooltip from 'react-tooltip';
import { MdLastPage, MdFirstPage } from 'react-icons/md';
import { GiphyFetch } from '@giphy/js-fetch-api';
import Message from './MessageNetflix';
import SendMessageForm from './SendMessageForm';
import LoginIllustration from './LoginIllustrationPopCorn';
import './chatbox.css';
import './chatboxNetflix.css';
import VoiceChatter from './VoiceChatter';
import Header from './Header';

function typingStatusFromUsers(users) {
  if (users.length === 0) return '';
  return `${users.join(', ')} ${users.length > 1 ? 'are' : 'is'} typing...`;
}

function injectScript(script) {
  const scriptElt = document.createElement('script');
  scriptElt.textContent = script;
  (document.head || document.documentElement).appendChild(scriptElt);
  scriptElt.remove();
}

class ChatBox extends React.Component {
  constructor(props) {
    super(props);
    const { nowPlaying } = this.props;
    this.state = {
      nowPlaying,
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
    this.socket = io('https://www.bingebox.live');
    this.gf = new GiphyFetch('lwiMnpcorQHdFIivZg43l3BJfJRlzdYO');
    this.play = true;
    this.pause = true;
    this.seeking = false;
    this.visible = true;
    this.userSeeked = true;
    this.eventQueue = [];
    this.bufferCounter = 0;
    this.queueManagerRunning = false;
    this.wasPlayingBeforeBuffer = null;
    this.typingTimeout = {};
    this.bufferObserver = null;
    this.isBuffering = !!(document.querySelector('.AkiraPlayerSpinner--container'));

    this.handleVideoEvents = this.handleVideoEvents.bind(this);
    this.video = document.getElementsByTagName('video')[0];
    injectScript(`window.addEventListener('message', (receiveMsg) => {
      const netflixAPI = window.netflix.appContext.state.playerApp.getAPI();
      const sessionId = netflixAPI.videoPlayer.getAllPlayerSessionIds();
      const currentVideoId = netflixAPI.getVideoIdBySessionId(sessionId);
      const videoPlayer = netflixAPI.videoPlayer.getVideoPlayerBySessionId(sessionId);
      if(receiveMsg.data.type && receiveMsg.data.type === 'seek' && receiveMsg.data.time) {
      videoPlayer.seek(receiveMsg.data.time);
      }
  }, false);`);
  }

  componentDidMount() {
    const buffer = document.querySelector('.nf-player-container');
    if (this.video) {
      this.video.addEventListener('pause', this.handleVideoEvents);
      this.video.addEventListener('play', this.handleVideoEvents);
      this.video.addEventListener('seeked', this.handleVideoEvents);
      this.video.addEventListener('seeking', this.handleVideoEvents);
    }

    this.bufferObserver = new MutationObserver(() => {
      if (this.isBuffering && !document.querySelector('.AkiraPlayerSpinner--container')) {
        this.isBuffering = false;
        this.socket.emit('client sync', { type: 'BUFFER STARTED' });
      }

      if (!this.isBuffering && document.querySelector('.AkiraPlayerSpinner--container')) {
        this.isBuffering = true;
        this.socket.emit('client sync', { type: 'BUFFER ENDED' });
      }
    });
    this.bufferObserver.observe(buffer, { childList: true });

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
          fromMe: gifMessage.fromMe,
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
      this.socket.emit('rec time', { time: this.video.currentTime * 1000, paused: this.video.paused });
    });
    this.socket.on('set time', (state) => {
      if (this.video) {
        this.eventQueue.push({ timeUpdate: true, time: state.time });
        if (state.paused !== this.video.paused) {
          if (state.paused) {
            this.eventQueue.push({ pause: true });
            this.performSync = false;
          } else {
            this.eventQueue.push({ play: true });
            this.performSync = false;
          }
        }
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
        }, 1000);
        this.typingTimeout[nickname] = id;
      } else {
        if (this.typingTimeout[nickname]) {
          clearTimeout(this.typingTimeout[nickname]);
        }

        const id = setTimeout(() => {
          const { typingUsers } = { ...this.state };
          this.setState({ typingUsers: typingUsers.filter((user) => user !== nickname) });
        }, 1000);
        this.typingTimeout[nickname] = id;
      }
    });

    this.socket.on('perform sync', (data) => {
      const { receivedMsgs } = { ...this.state };
      switch (data.type) {
        case 'PAUSE':
          receivedMsgs.unshift({ status: 'PAUSE', nickname: data.nickname });
          this.setState({ receivedMsgs });
          this.eventQueue.push({ pause: true });
          break;
        case 'PLAY':
          receivedMsgs.unshift({ status: 'PLAY', nickname: data.nickname });
          this.setState({ receivedMsgs });
          this.eventQueue.push({ play: true });
          break;
        case 'SEEKING':
          receivedMsgs.unshift({ status: 'SEEKING', nickname: data.nickname, time: data.value });
          this.setState({ receivedMsgs });
          this.eventQueue.push({ timeUpdate: true, time: data.value, paused: data.paused });
          break;
        case 'BUFFER STARTED':
          receivedMsgs.unshift({ status: 'BUFFER', nickname: data.nickname });
          this.setState({ receivedMsgs });
          if (this.bufferCounter === 0) {
            this.eventQueue.push({ pause: true });
          }
          this.bufferCounter += 1;
          break;
        case 'BUFFER ENDED':
          this.bufferCounter -= 1;
          break;
        default:
          // do nothing
      }
      if (!this.queueManagerRunning && this.eventQueue[0]) this.queueManager();
    });
  }

  componentWillUnmount() {
    if (this.video) {
      this.video.removeEventListener('pause', this.handleVideoEvents);
      this.video.removeEventListener('play', this.handleVideoEvents);
      this.video.removeEventListener('seeked', this.handleVideoEvents);
      this.video.removeEventListener('seeking', this.handleVideoEvents);
    }
    if (this.bufferObserver) {
      this.bufferObserver.disconnect();
      this.bufferObserver = null;
    }
    this.socket.disconnect();
  }

  pauseVideo(target) {
    this.pause = false;
    target.pause();
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
      // tr.currentTime = ti;
      window.postMessage({ type: 'seek', time: ti }, '*');
      if (state) {
        this.play = false;
        tr.play().then(() => {
          this.pause = false;
          tr.pause();
        }).catch(() => {
          this.pause = false;
          tr.pause();
        });
      }
    });
    seek(target, time, target.paused).then(() => {
      this.eventQueue.shift();
      this.queueManager();
    });
  }

  playVideo(target) {
    this.play = false;
    target.play().then(() => {
      this.eventQueue.shift();
      this.queueManager();
    }).catch(() => {
      this.eventQueue.shift();
      this.queueManager();
    });
  }

  queueManager() {
    if (this.eventQueue[0]) {
      const event = this.eventQueue[0];
      this.queueManagerRunning = true;
      if (event.pause) {
        this.pauseVideo(this.video);
      } else if (event.play) {
        this.playVideo(this.video);
      } else if (event.timeUpdate) {
        this.seekVideo(this.video, event.time);
      }
    } else {
      this.queueManagerRunning = false;
    }
  }

  seek(time) {
    window.postMessage({ type: 'seek', time }, '*');
  }

  handleVideoEvents(event) {
    switch (event.type) {
      case 'pause':
        if (this.pause) {
          if (this.video.readyState === 4) {
            this.socket.emit('client sync', { type: 'PAUSE' });
          }
        } else {
          this.pause = true;
        }
        break;
      case 'play':
        if (this.play) {
          if (this.bufferCounter > 0) {
            this.eventQueue.push({ pause: true });
            if (!this.queueManagerRunning && this.eventQueue[0]) this.queueManager();
          } else if (this.video.readyState === 4) {
            this.socket.emit('client sync', { type: 'PLAY' });
          }
        } else {
          this.play = true;
        }
        break;
      case 'seeked':
        if (this.seeking) {
          this.seeking = false;
        }
        break;
      case 'seeking':
        if (this.seeking !== (this.video.currentTime * 1000)) {
          this.seeking = (this.video.currentTime * 1000);
          if (this.userSeeked) {
            this.socket.emit('client sync', { type: 'SEEKING', value: (this.video.currentTime * 1000) });
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
    const videoPlayerContainer = document.querySelector('.NFPlayer.nf-player-container');
    if (isVisible) {
      videoPlayerContainer.style.setProperty('width', '100%', 'important');
      document.getElementById('psychic-giggler').style.width = '0%';
      setTimeout(() => { this.setState({ isVisible: false }); }, 200);
    } else {
      videoPlayerContainer.style.setProperty('width', '80%', 'important');
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
            <Header />
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
                  type="text"
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
                <div id="collapse-chat" className="collapse-btn" onClick={() => this.showHide()}><MdLastPage style={{ width: '100%', height: '100%' }} /></div>
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
