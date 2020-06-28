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
import VoiceChatter from './VoiceChatter';

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
    };
    this.socket = io('https://radiant-sierra-52862.herokuapp.com');
    this.play = true;
    this.pause = true;
    this.seeking = false;
    this.eventQueue = [];
    this.bufferCounter = 0;
    this.visible = true;
    this.queueManagerRunning = false;
    this.wasPlayingBeforeBuffer = null;
  }

  componentDidMount() {
    const [sdk] = document.getElementsByClassName('webPlayerSDKContainer');
    const [buffer] = document.getElementsByClassName('f1la87wm');
    if (sdk) {
      const [video] = sdk.getElementsByTagName('video');
      if (video) {
        this.setState({ currentVideo: video });
        // video.addEventListener('timeupdate', this.updatePlayingTime);
        video.addEventListener('pause', (e) => this.handleVideoEvents(e));
        video.addEventListener('play', (e) => this.handleVideoEvents(e));
        video.addEventListener('seeked', (e) => this.handleVideoEvents(e));
        video.addEventListener('seeking', (e) => this.handleVideoEvents(e));
      }
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
      const { currentVideo } = { ...this.state };
      if (currentVideo) this.socket.emit('rec time', { time: currentVideo.currentTime, paused: currentVideo.paused });
    });
    const bufferObserver = new MutationObserver(((mutations) => {
      // const { currentVideo } = { ...this.state };
      mutations.forEach((mutationRecord) => {
        if (mutationRecord.target.style.display === 'none') this.socket.emit('client sync', { type: 'BUFFER ENDED' });
        else this.socket.emit('client sync', { type: 'BUFFER STARTED' });
      });
    }));
    bufferObserver.observe(buffer, { attributes: true, attributeFilter: ['style'] });

    this.socket.on('set time', (state) => {
      const { currentVideo } = { ...this.state };
      if (currentVideo) {
        // currentVideo.currentTime = state.time;
        this.eventQueue.push({ timeUpdate: true, time: state.time });
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
      }
      if (!this.queueManagerRunning && this.eventQueue[0]) this.queueManager(this.eventQueue[0]);
    });

    this.socket.on('perform sync', (data) => {
      const { currentVideo } = { ...this.state };
      switch (data.type) {
        case 'PAUSE':
          this.eventQueue.push({ pause: true });
          // currentVideo.pause();
          break;
        case 'PLAY':
          this.eventQueue.push({ play: true });
          // currentVideo.play();
          break;
        case 'SEEKING':
          this.eventQueue.push({ timeUpdate: true, time: data.value, paused: data.paused });
          // currentVideo.currentTime = data.value;
          break;
        case 'BUFFER STARTED':
          if (this.bufferCounter === 0) {
            this.wasPlayingBeforeBuffer = !currentVideo.paused;
            if (this.wasPlayingBeforeBuffer) this.eventQueue.push({ pause: true });
          }
          this.bufferCounter += 1;
          break;
        case 'BUFFER ENDED':
          this.bufferCounter -= 1;
          if (this.bufferCounter === 0 && this.wasPlayingBeforeBuffer) {
            this.eventQueue.push({ play: true, buffer: true});
          }
          break;
        default:
          // do nothing
      }
      if (!this.queueManagerRunning && this.eventQueue[0]) this.queueManager(this.eventQueue[0]);
    });
  }

  componentWillUnmount() {
    const { currentVideo } = { ...this.state };
    if (currentVideo) {
      // currentVideo.removeEventListener('timeupdate', this.updatePlayingTime);
    }
    this.socket.disconnect();
  }

  pauseVideo(target) {
    this.pause = false;
    target.pause();
    this.eventQueue.shift();
  }

  seekVideo(target, time, paused) {
    const seek = (tr, ti, state) => new Promise((resolve) => {
      const fn = () => {
        tr.removeEventListener('seeked', fn);
        resolve();
        console.log(this.eventQueue);
      };
      tr.addEventListener('seeked', fn);
      tr.currentTime = ti;
      if (state) tr.play().then(() => tr.pause());
    });
    seek(target, time, paused).then(this.eventQueue.shift());
  }

  playVideo(target, buffer) {
    if (!buffer) this.play = false;
    target.play().then(this.eventQueue.shift());
  }

  queueManager(queue) {
    this.queueManagerRunning = true;
    const { currentVideo } = { ...this.state };
    if (queue.pause) this.pauseVideo(currentVideo);
    else if (queue.play) this.playVideo(currentVideo, queue.buffer);
    else if (queue.timeUpdate) this.seekVideo(currentVideo, this.eventQueue[0].time, this.eventQueue[0].paused);
    if (this.eventQueue[0]) this.queueManager(this.eventQueue[0]);
    else this.queueManagerRunning = false;
  }

  handleVideoEvents(event) {
    const { currentVideo } = { ...this.state };
    switch (event.type) {
      case 'pause':
        if (this.bufferCounter === 0) {
          if (this.pause && currentVideo.readyState === 4) {
            this.socket.emit('client sync', { type: 'PAUSE' });
          } else this.pause = true;
        }
        break;
      case 'play':
        if (this.bufferCounter > 0) {
          currentVideo.pause();
        } else if (this.play && currentVideo.readyState === 4) {
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
          this.socket.emit('client sync', { type: 'SEEKING', value: currentVideo.currentTime, paused: currentVideo.paused });
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
