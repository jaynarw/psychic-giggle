/* eslint-disable react/prop-types */
import React from 'react';
import * as io from 'socket.io-client';
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
      receivedMsgs: [],
      errorMsg: false,
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
        this.setState({ currentSession: data, errorMsg: false });
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
    const { joinSession } = { ...this.state };
    this.socket.emit('join session', joinSession, (isValid) => {
      if (isValid) this.socket.emit('sync time');
    });
  }

  render() {
    const {
      nowPlaying, playingTime, currentSession, joinSession, receivedMsgs, nicknameInput, errorMsg,
    } = { ...this.state };
    return (
      <div id="psychick" className="session-form-enabled">
        {!currentSession && (
        <>
          <LoginIllustration />
          <div className="card-psychic">
            <form
              className="session-form"
              id="nickname-form"
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
            <button type="button" className="session-button">Join Session</button>
          </div>
        </>
        )}
        {currentSession && (
        <>
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
