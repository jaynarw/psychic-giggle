/* eslint-disable react/prop-types */
import React from 'react';
import * as io from 'socket.io-client';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import ReactTooltip from 'react-tooltip';
import { MdLastPage, MdFirstPage } from 'react-icons/md';
import { GiphyFetch } from '@giphy/js-fetch-api';
import Message from './Message';
import SendMessageForm from './SendMessageForm';
import LoginIllustration from './LoginIllustrationPopCorn';
import './chatbox.css';
import VoiceChatter from './VoiceChatter';
import Header from './Header';

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
    this.socket = io('https://www.bingebox.live');
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
        } else {
          this.socket.emit('client sync', { type: 'BUFFER STARTED' });
        }
      });
    }));
    this.bufferObserver.observe(buffer, { attributes: true, attributeFilter: ['style'] });

    this.socket.on('update users list', (onlineUsers) => {
      this.setState({ onlineUsers });
    });

    this.socket.on('get-session', () => {
      const {
        currentSession, nicknameInput, nowPlaying,
      } = { ...this.state };
      console.log(currentSession);
      if (currentSession && nicknameInput && nowPlaying) {
        console.log('Rejoining', currentSession);
        this.socket.emit('join session', currentSession, nicknameInput, nowPlaying, (data) => {
          if (data.success) {
            this.socket.emit('sync time');
            this.setState({ currentSession, errorMsgJoin: false, errorMsg: false });
          } else if (data.error1) this.setState({ errorMsgJoin: data.error1 });
          else if (data.error2) this.displayError(data.error2);
        });
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
      const { currentVideo } = { ...this.state };
      if (currentVideo) this.socket.emit('rec time', { time: (currentVideo.currentTime - currentVideo.duration), paused: currentVideo.paused });
    });
    this.socket.on('set time', (state) => {
      const { currentVideo } = { ...this.state };
      if (currentVideo) {
        if (state.paused !== currentVideo.paused) {
          if (state.paused) {
            this.eventQueue.push({ pause: true });
          } else {
            this.eventQueue.push({ play: true });
          }
        }
        this.eventQueue.push({ timeUpdate: true, time: (state.time + currentVideo.duration) });
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
      const { currentVideo, receivedMsgs } = { ...this.state };
      switch (data.type) {
        case 'PAUSE':
          receivedMsgs.unshift({ status: 'PAUSE', nickname: data.nickname });
          this.setState({ receivedMsgs });
          this.eventQueue.push({ pause: true });
          // currentVideo.pause();
          break;
        case 'PLAY':
          receivedMsgs.unshift({ status: 'PLAY', nickname: data.nickname });
          this.setState({ receivedMsgs });
          this.eventQueue.push({ play: true });
          // currentVideo.play();
          break;
        case 'SEEKING':
          receivedMsgs.unshift({ status: 'SEEKING', nickname: data.nickname, time: (data.value + currentVideo.duration) });
          this.setState({ receivedMsgs });
          this.eventQueue.push({ timeUpdate: true, time: (data.value + currentVideo.duration) });
          // currentVideo.currentTime = data.value;
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
      tr.currentTime = ti;
      if (state) {
        this.play = false;
        this.pause = false;
        tr.play();
        tr.pause();
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
    });
  }

  queueManager() {
    if (this.eventQueue[0]) {
      const event = this.eventQueue[0];
      this.queueManagerRunning = true;
      const { currentVideo } = { ...this.state };
      if (event.pause) {
        this.pauseVideo(currentVideo);
      } else if (event.play) {
        this.playVideo(currentVideo);
      } else if (event.timeUpdate) {
        this.seekVideo(currentVideo, this.eventQueue[0].time);
      }
    } else {
      this.queueManagerRunning = false;
    }
  }

  handleVideoEvents(event) {
    const { currentVideo } = { ...this.state };
    switch (event.type) {
      case 'pause':
        if (this.pause) {
          if (currentVideo.readyState === 4) {
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
          } else if (currentVideo.readyState === 4) {
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
        if (this.seeking !== currentVideo.currentTime) {
          this.seeking = currentVideo.currentTime;
          if (this.userSeeked) {
            this.socket.emit('client sync', { type: 'SEEKING', value: (currentVideo.currentTime - currentVideo.duration) });
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
            <Header />
            <LoginIllustration />
            <div className="card-psychic .BoxShadowHelper-1">
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
            <div className="card-psychic .BoxShadowHelper-1" style={{ padding: '10% 5%' }}>
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
              <button type="button" className="outlined-button" onClick={(e) => this.joinSessionHandler(e)}>Join Session</button>
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
