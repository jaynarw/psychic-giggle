/* eslint-disable react/prop-types */
import React from 'react';
import * as io from 'socket.io-client';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import ReactTooltip from 'react-tooltip';
import {
  MdLastPage, MdFirstPage, MdLink, MdPeopleOutline, MdPeople,
} from 'react-icons/md';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { CSSTransition } from 'react-transition-group';
import Message from './Message';
import SendMessageForm from './SendMessageForm';
import LoginIllustration from './LoginIllustrationPopCorn';
import './chatbox.css';
import VoiceChatter from './VoiceChatter';
import Header from './Header';

function moveToElementPosition(elementID, targetElementID) {
  const target = document.querySelector(targetElementID);
  const from = document.querySelector(elementID);
  const pos = {
    top: `${target.offsetTop}px`,
    left: `${target.offsetLeft}px`,
  };
  from.style.left = pos.left;
  from.style.top = pos.top;
}

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
      removeHeader: false,
      showForm: false,
      copied: false,
      showSessionInfo: false,
      usersDropdown: false,
    };
    this.socket = io('https://www.bingebox.live');
    this.gf = new GiphyFetch('25Pso92Llhd2BTDtlh0ftwn069vyCVKn');
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
    setTimeout(() => {
      const container = document.getElementById('psychick');
      container.classList.remove('centered-binge');
      setTimeout(() => {
        this.setState({ showForm: true });
      }, 500);
    }, 500);

    // const [buffer] = document.getElementsByClassName('f1la87wm');
    const playerSet = document.querySelector('.player-base');
    const buffer = playerSet.querySelector('.web_player_loader');
    const [video] = playerSet.getElementsByTagName('video');
    if (video) {
      this.setState({ currentVideo: video });

      video.addEventListener('pause', this.handleVideoEvents);
      video.addEventListener('play', this.handleVideoEvents);
      video.addEventListener('seeked', this.handleVideoEvents);
      video.addEventListener('seeking', this.handleVideoEvents);
    }

    this.bufferObserver = new MutationObserver(((mutations) => {
      mutations.forEach((mutationRecord) => {
        if (mutationRecord.target.classList.contains('loader')) {
          this.socket.emit('client sync', { type: 'BUFFER STARTED' });
          console.log('Buffer started');
        } else {
          const { currentVideo } = { ...this.state };
          this.socket.emit('client sync', { type: 'BUFFER ENDED', paused: currentVideo.paused });
          console.log('Buffer ended');
        }
      });
    }));
    this.bufferObserver.observe(buffer, { attributes: true, attributeFilter: ['class'] });

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
        this.setState({ currentSession: data.session, errorMsg: false, showForm: false });
        const logo = document.querySelector('.header-bingebox');
        const container = document.getElementById('psychick');
        logo.style.padding = '0px';
        logo.classList.add('logo-chat');
        logo.querySelector('svg').classList.add('popcorn-logo-chat');
        moveToElementPosition('.header-bingebox', '#logo-chat');
        setTimeout(() => {
          setTimeout(() => this.setState({ removeHeader: true }), 200);
          container.classList.remove('animated-box');
        }, 500);
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
        this.setState({
          currentSession: joinSessionInput,
          errorMsgJoin: false,
          errorMsg: false,
          showForm: false,
        });
        const logo = document.querySelector('.header-bingebox');
        const container = document.getElementById('psychick');
        logo.style.padding = '0px';
        logo.classList.add('logo-chat');
        logo.querySelector('svg').classList.add('popcorn-logo-chat');
        moveToElementPosition('.header-bingebox', '#logo-chat');
        setTimeout(() => {
          setTimeout(() => this.setState({ removeHeader: true }), 200);
          container.classList.remove('animated-box');
        }, 500);
      } else if (data.error1) this.setState({ errorMsgJoin: data.error1 });
      else if (data.error2) this.displayError(data.error2);
    });
  }

  showHide() {
    const { isVisible } = { ...this.state };
    const playerSet = document.querySelector('.player-base');
    const playerSkin = playerSet.querySelector('.skin-overlay-container');
    if (isVisible) {
      playerSet.childNodes.forEach((elt) => {
        elt.style.setProperty('width', '100%', 'important');
      });
      playerSkin.style.setProperty('width', '100%', 'important');
      document.getElementById('psychic-giggler').style.width = '0%';
      setTimeout(() => { this.setState({ isVisible: false }); }, 200);
    } else {
      playerSet.childNodes.forEach((elt) => {
        elt.style.setProperty('width', '80%', 'important');
      });
      playerSkin.style.setProperty('width', '80%', 'important');
      document.getElementById('psychic-giggler').style.width = '20%';
      setTimeout(() => { this.setState({ isVisible: true }); }, 200);
      this.setState({ notifications: 0 });
    }
  }

  updateLiveCalls(liveCalls) {
    // this.liveCalls = liveCalls;
    this.setState({ liveCalls });
  }

  copySessionHovered() {
    this.setState({ showSessionInfo: true });
  }

  copySessionExit() {
    this.setState({ showSessionInfo: false });
  }

  hoverLogo() {
    const ref = document.querySelector('#logo-chat');
    ref.classList.remove('animated');
    void ref.offsetWidth;
    ref.classList.add('animated');
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
      removeHeader,
      showForm,
      copied,
      showSessionInfo,
      usersDropdown,
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
        <div id="psychick" className={`${currentSession ? 'animated-box' : 'session-form-enabled centered-binge'}`}>
          {!removeHeader && <Header />}
          <CSSTransition
            in={showForm}
            timeout={200}
            classNames="binge-fade"
            unmountOnExit
            // onEnter={() => setShowButton(false)}
            // onExited={() => setShowButton(true)}
          >
            <div className="binge-form-wrapper">
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
            </div>
          </CSSTransition>
          {currentSession && (
          <>
            <div className="session-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="main-binge-header">
                <div id="collapse-chat" className="chat-header-icon" onClick={() => this.showHide()}>
                  <MdLastPage style={{ width: '100%', height: '100%' }} />
                </div>
                <div className="logo-bingebox animated logo-chat" id="logo-chat" onMouseEnter={() => this.hoverLogo()}>
                  <svg className="popcorn-logo-chat" version="1.0" xmlns="http://www.w3.org/2000/svg" width="298px" height="472px" viewBox="0 0 2980 4720" preserveAspectRatio="xMidYMid meet">
                    <g id="layer101" fill="rgba(255,255,255,0.88)" stroke="none">
                      <path d="M575 4690 c-3 -14 -18 -115 -35 -225 -16 -110 -138 -902 -270 -1760 -132 -858 -240 -1576 -240 -1596 0 -72 -7 -69 191 -69 l179 0 -5 38 c-3 20 24 276 58 567 l64 530 -32 65 c-166 333 -149 751 42 1065 39 65 132 188 145 193 4 2 8 22 8 45 1 23 12 128 25 232 30 236 100 924 94 929 -2 2 -52 6 -111 8 l-108 3 -5 -25z" />
                      <path d="M1168 4713 c-65 -2 -118 -5 -118 -7 0 -2 -13 -158 -29 -347 -17 -189 -33 -398 -36 -464 -4 -66 -13 -132 -20 -147 -12 -24 -11 -26 4 -18 40 22 130 59 171 71 25 7 50 16 55 20 6 4 33 10 60 14 28 4 57 9 66 11 13 4 17 49 27 322 7 174 16 370 19 435 l6 117 -44 -2 c-24 -1 -97 -4 -161 -5z" />
                      <path d="M1650 4713 c11 -270 27 -859 25 -864 -3 -3 21 -9 52 -13 31 -4 61 -10 67 -15 6 -4 34 -14 61 -21 28 -7 59 -19 70 -27 11 -7 27 -13 36 -13 9 0 34 -12 55 -26 21 -15 33 -20 26 -11 -12 14 -28 209 -52 647 -5 96 -12 214 -16 263 l-6 87 -159 0 c-87 0 -159 -3 -159 -7z" />
                      <path d="M2190 4718 c0 -4 42 -353 95 -792 25 -208 45 -383 45 -387 0 -5 9 -9 20 -9 17 0 20 -7 20 -39 0 -29 10 -54 43 -100 48 -70 92 -144 108 -181 6 -14 17 -38 24 -55 8 -16 19 -48 25 -70 6 -22 16 -50 22 -62 6 -13 8 -26 5 -30 -4 -3 -1 -13 6 -21 17 -21 17 -476 0 -493 -6 -6 -9 -18 -6 -25 3 -8 1 -20 -4 -27 -6 -6 -16 -34 -23 -62 -7 -27 -19 -59 -27 -70 -7 -11 -13 -26 -13 -35 0 -9 -11 -31 -23 -50 -19 -27 -22 -40 -15 -65 10 -38 120 -983 121 -1047 l1 -48 125 0 c69 0 149 3 178 6 65 8 67 17 42 178 -10 67 -57 373 -104 681 -47 308 -116 763 -154 1010 -39 248 -92 601 -120 785 -28 184 -73 484 -101 665 -27 182 -50 333 -50 338 0 4 -54 7 -120 7 -66 0 -120 -1 -120 -2z" />
                      <path d="M1116 3338 c-14 -20 -16 -94 -16 -610 0 -322 4 -597 9 -610 12 -31 56 -55 74 -40 7 6 40 25 72 42 86 44 156 85 163 96 4 5 36 23 72 39 36 17 70 35 75 41 13 14 95 61 168 96 31 16 57 31 57 36 0 9 58 42 74 42 7 0 22 9 33 19 12 11 36 27 54 35 38 17 138 74 223 126 52 32 56 38 56 71 0 31 -4 38 -25 43 -14 4 -25 11 -25 16 0 5 -15 16 -32 25 -18 8 -40 19 -48 24 -71 47 -222 131 -234 131 -8 0 -19 6 -23 13 -8 13 -64 46 -195 116 -32 17 -67 40 -78 51 -11 11 -26 20 -34 20 -8 0 -50 22 -93 49 -43 26 -106 63 -140 81 -35 17 -63 35 -63 39 0 12 -49 31 -80 31 -18 0 -34 -8 -44 -22z" />
                      <path d="M823 1771 c-2 -48 -31 -439 -48 -653 l-5 -68 256 0 c240 0 256 1 249 18 -3 9 -3 135 1 280 6 230 9 262 23 263 9 0 -22 11 -69 24 -144 39 -245 83 -350 155 l-55 37 -2 -56z" />
                      <path d="M2135 1794 c-108 -77 -259 -140 -415 -173 -31 -6 -32 -8 -12 -13 22 -6 22 -8 24 -220 2 -117 3 -241 2 -275 l-1 -63 244 0 c188 0 243 3 243 13 0 8 4 7 10 -3 7 -10 8 -1 5 30 -14 118 -55 723 -50 731 10 15 3 11 -50 -27z" />
                      <path d="M111 993 l-73 -4 4 -37 c4 -28 0 -44 -19 -65 -16 -20 -23 -41 -23 -72 0 -36 5 -47 32 -70 27 -23 39 -26 75 -22 27 3 46 0 53 -8 5 -6 28 -20 49 -30 30 -13 41 -24 45 -49 7 -36 44 -79 88 -102 22 -12 47 -15 87 -11 47 4 65 0 111 -22 48 -23 68 -26 162 -27 l107 -1 27 -32 c32 -38 94 -75 154 -92 l45 -12 -32 -9 c-112 -30 -89 -198 27 -198 37 0 49 -7 97 -50 39 -36 70 -55 111 -66 66 -20 162 -15 211 10 26 14 39 15 63 7 100 -35 208 21 233 120 l7 27 46 -15 c64 -20 175 -13 228 15 29 15 51 19 81 15 85 -11 151 54 140 139 -3 22 -15 50 -26 62 -12 12 -21 29 -21 38 0 13 6 14 53 1 65 -18 146 -10 207 19 62 30 133 104 155 161 22 58 51 64 79 16 29 -50 109 -74 159 -48 69 36 97 100 73 170 -14 39 -13 45 6 83 11 22 23 69 26 103 l5 63 -1389 -2 c-764 -1 -1422 -4 -1463 -5z" />
                    </g>
                  </svg>
                  <span className="binge">binge</span>
                  <span className="box">box</span>
                </div>
                <CopyToClipboard text={currentSession}>
                  <div className="chat-header-icon" id="copy-session" onMouseEnter={() => this.copySessionHovered()} onMouseLeave={() => this.copySessionExit()} onClick={() => this.setState({ copied: true })}>
                    <MdLink style={{ width: '100%', height: '100%' }} />
                  </div>
                </CopyToClipboard>
                <div
                  className="chat-header-icon"
                  onClick={() => {
                    const { usersDropdown } = { ...this.state };
                    this.setState({ usersDropdown: !usersDropdown });
                  }}
                  style={{ color: usersDropdown ? '#f19e98' : '' }}
                >
                  {usersDropdown ? <MdPeople style={{ width: '100%', height: '100%' }} /> : <MdPeopleOutline style={{ width: '100%', height: '100%' }} />}
                </div>
              </div>
              <CSSTransition
                in={showSessionInfo}
                timeout={200}
                mountOnEnter
                classNames="binge-fade"
                onExited={() => this.setState({ copied: false })}
              >
                <div className="copy-session-info">
                  Session ID -
                  {' '}
                  {currentSession}
                  {copied ? ' - Copied!' : ''}
                </div>
              </CSSTransition>
              <VoiceChatter socket={this.socket} onlineUsers={onlineUsers} liveCalls={liveCalls} updateLiveCalls={(calls) => this.updateLiveCalls(calls)} usersDropdown={usersDropdown} />
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
