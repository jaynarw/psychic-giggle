/* eslint-disable react/prop-types */
import React from 'react';
import * as io from 'socket.io-client';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Message from './Message';
import SendMessageForm from './SendMessageForm';
import LoginIllustration from './LoginIllustration';
import './chatbox.css';

class ChatBox extends React.Component {
  constructor(props) {
    super(props);
    const { nowPlaying } = this.props;
    this.state = {
      nowPlaying,
      playingTime: 0,
      currentVideo: null,
      othersConnected: false,
      currentSession: false,
      joinSession: '',
      nicknameInput: '',
      joinSessionInput: '',
      receivedMsgs: [],
      errorMsg: false,
      errorMsgJoin: false,
    };
    this.socket = io('http://localhost');
    this.performSync = true;
    this.seek = true;
    this.updatePlayingTime = this.updatePlayingTime.bind(this);
  }

  componentDidMount() {
    const [sdk] = document.getElementsByClassName('webPlayerSDKContainer');
    if (sdk) {
      const [video] = sdk.getElementsByTagName('video');
      if (video) {
        this.setState({ currentVideo: video });
        video.addEventListener('timeupdate', this.updatePlayingTime);
        video.addEventListener('pause', (e) => this.handleVideoEvents(e));
        video.addEventListener('play', (e) => this.handleVideoEvents(e));
        video.addEventListener('seeked', (e) => this.handleVideoEvents(e));
      }
    }
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
      console.log('User left');
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
        currentVideo.currentTime = state.time;
        if (state.paused !== currentVideo.paused) {
          if (state.paused) {
            currentVideo.pause();
            this.performSync = false;
          } else {
            currentVideo.play();
            this.performSync = false;
          }
        }
      }
    });

    this.socket.on('perform sync', (data) => {
      const { currentVideo } = { ...this.state };
      switch (data.type) {
        case 'PAUSE':
          this.performSync = false;
          currentVideo.pause();
          this.performSync = false;
          break;
        case 'PLAY':
          this.performSync = false;
          currentVideo.play();
          this.performSync = false;
          break;
        case 'SEEKED':
          currentVideo.currentTime = data.value;
          this.seek = false;
          // currentVideo.play();
          break;
        default:
          // do nothing
      }
    });
  }

  componentWillUnmount() {
    const { currentVideo } = { ...this.state };
    if (currentVideo) {
      currentVideo.removeEventListener('timeupdate', this.updatePlayingTime);
    }
    this.socket.disconnect();
  }

  handleVideoEvents(event) {
    const { currentVideo } = { ...this.state };
    switch (event.type) {
      case 'pause':
        if (this.performSync) this.socket.emit('client sync', { type: 'PAUSE' });
        else this.performSync = true;
        break;
      case 'play':
        if (this.performSync) this.socket.emit('client sync', { type: 'PLAY' });
        else this.performSync = true;
        break;
      case 'seeked':
        if (this.seek) this.socket.emit('client sync', { type: 'SEEKED', value: currentVideo.currentTime });
        else this.seek = true;
        break;
      default:
        // do nothing
    }
  }

  updatePlayingTime(event) {
    this.setState({ playingTime: event.target.currentTime });
  }

  displayError(errorMsg) {
    this.setState({ errorMsg });
  }

  createSession(event) {
    const { nicknameInput } = { ...this.state };
    this.socket.emit('create session', nicknameInput, (data) => {
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

  render() {
    const {
      currentSession, receivedMsgs, nicknameInput, errorMsg, errorMsgJoin, joinSessionInput,
    } = { ...this.state };
    return (
      <div id="psychick" className={`${currentSession ? '' : 'session-form-enabled'}`}>
        {!currentSession && (
        <>
          <LoginIllustration />
          <div className="card-psychic">
            <form
              className="session-form"
              id="nickname-form"
              autoComplete="off"
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
            <CopyToClipboard text={currentSession}>
              <div className="username-input" id="copy-session">
                Share your session ID with friends
              </div>
            </CopyToClipboard>
          </div>
          <div id="chat-message-list">
            {receivedMsgs.map((messageData) => <Message username={nicknameInput} messageData={messageData} />)}
          </div>
          <SendMessageForm username={nicknameInput} socket={this.socket} />
        </>
        ) }
      </div>
    );
  }
}
export default ChatBox;
