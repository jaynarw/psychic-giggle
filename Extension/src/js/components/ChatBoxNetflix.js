/* eslint-disable react/prop-types */
import React from 'react';
import * as io from 'socket.io-client';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import ReactTooltip from 'react-tooltip';
import { MdLastPage, MdFirstPage } from 'react-icons/md';
import Message from './Message';
import SendMessageForm from './SendMessageForm';
import LoginIllustration from './LoginIllustration';
import './chatbox.css';
import './chatboxNetflix.css';
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
    };
    this.socket = io('https://radiant-sierra-52862.herokuapp.com');
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

    this.handleVideoEvents = this.handleVideoEvents.bind(this);
    this.netflixAPI = window.netflix.appContext.state.playerApp.getAPI();
    this.sessionId = this.netflixAPI.videoPlayer.getAllPlayerSessionIds();
    this.currentVideoId = this.netflixAPI.getVideoIdBySessionId(this.sessionId);
    this.videoPlayer = this.netflixAPI.videoPlayer.getVideoPlayerBySessionId(this.sessionId);
    [this.video] = document.getElementsByTagName('video');
  }

  componentDidMount() {
    if (this.video) {
      this.video.addEventListener('pause', this.handleVideoEvents);
      this.video.addEventListener('play', this.handleVideoEvents);
      this.video.addEventListener('seeked', this.handleVideoEvents);
      this.video.addEventListener('seeking', this.handleVideoEvents);
    }

    this.socket.on('update users list', (onlineUsers) => {
      this.setState({ onlineUsers });
    });
    this.socket.on('msg-recieved', (data) => {
      const { receivedMsgs } = { ...this.state };
      receivedMsgs.unshift(data);
      this.setState({ receivedMsgs });
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
      this.socket.emit('rec time', { time: this.videoPlayer.getCurrentTime(), paused: this.videoPlayer.isPaused() });
    });
    this.socket.on('set time', (state) => {
      this.videoPlayer.seek(state.time);
      if (state.paused !== this.videoPlayer.isPaused()) {
        if (state.paused) {
          this.videoPlayer.pause();
          this.performSync = false;
        } else {
          this.videoPlayer.play();
          this.performSync = false;
        }
      }
    });

    this.socket.on('perform sync', (data) => {
      switch (data.type) {
        case 'PAUSE':
          this.pause = false;
          this.videoPlayer.pause();
          break;
        case 'PLAY':
          this.play = false;
          this.videoPlayer.play();
          break;
        case 'SEEKING':
          this.videoPlayer.seek(data.value);
          break;
        default:
          // do nothing
      }
    });
  }

  componentWillUnmount() {
    if (this.video) {
      this.video.removeEventListener('pause', this.handleVideoEvents);
      this.video.removeEventListener('play', this.handleVideoEvents);
      this.video.removeEventListener('seeked', this.handleVideoEvents);
      this.video.removeEventListener('seeking', this.handleVideoEvents);
    }
    this.socket.disconnect();
  }

  handleVideoEvents(event) {
    switch (event.type) {
      case 'pause':
        if (this.pause && this.seeking !== true) {
          this.socket.emit('client sync', { type: 'PAUSE' });
        } else this.pause = true;
        break;
      case 'play':
        if (this.play && this.seeking !== true) {
          this.socket.emit('client sync', { type: 'PLAY' });
        } else this.play = true;
        break;
      case 'seeked':
        if (this.seeking) {
          this.seeking = false;
        }
        break;
      case 'seeking':
        if (this.seeking !== true) {
          this.seeking = true;
          this.socket.emit('client sync', { type: 'SEEKING', value: this.videoPlayer.getCurrentTime() });
        } else this.seeking = true;
        break;
      default:
        // do nothing
    }
  }

  // updatePlayingTime(event) {
  //   this.setState({ playingTime: event.target.currentTime });
  // }

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
    }
  }

  updateLiveCalls(liveCalls) {
    // this.liveCalls = liveCalls;
    this.setState({ liveCalls });
  }

  render() {
    const {
      currentSession, receivedMsgs, nicknameInput, errorMsg, errorMsgJoin, joinSessionInput, isVisible, liveCalls, onlineUsers,
    } = { ...this.state };
    return (
      <>
        {/* <ReactTooltip place="left" type="light" /> */}
        { !isVisible
        && (
          <>
            <div
              className="show-hide-button"
              data-tip="Show chat"
              onClick={() => this.showHide()}
              style={{ top: `${document.getElementById('collapse-chat').getBoundingClientRect().y}px` }}
            >
              <MdFirstPage style={{ width: '100%', height: '100%' }} />
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
                    Share your session ID
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
            <SendMessageForm socket={this.socket} />
          </>
          ) }
        </div>
      </>
    );
  }
}
export default ChatBox;
