/* eslint-disable react/prop-types */
import React from 'react';
import { Picker, Emoji } from 'emoji-mart';
import * as io from 'socket.io-client';
import {
  Skeleton, Button, Row,
} from 'antd';
// import 'antd/dist/antd.less';
import 'antd/lib/button/style/index.less';
import 'antd/lib/skeleton/style/index.less';
import 'antd/lib/layout/style/index.less';
import 'antd/lib/grid/style/index.less';
import './chatbox.css';
import 'emoji-mart/css/emoji-mart.css';

class ChatBox extends React.Component {
  constructor(props) {
    super(props);
    const { nowPlaying } = this.props;
    this.state = {
      nowPlaying,
      playingTime: 0,
      currentVideo: null,
      othersConnected: false,
      sessionCreated: false,
      createdSession: '',
      joinSession: '',
      username: '',
      message: '',
      showEmojiPicker: false,
      receivedMsgs: [],
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

  createSession(event) {
    this.socket.emit('create session', (data) => {
      this.setState({ createdSession: data });
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

  sendMessage(event) {
    const { message, username } = { ...this.state };
    event.preventDefault();
    if (message && message.length > 0) this.socket.emit('msg', { from: username, message });
    this.setState({ message: '' });
  }

  addEmoji(e) {
    const { message } = { ...this.state };
    console.log(e);
    this.setState({ message: `${message} ${e.native} ` });
  }

  showPicker(e) {
    this.setState((prevState) => ({ showEmojiPicker: !prevState.showEmojiPicker }));
  }

  render() {
    const {
      nowPlaying, playingTime, createdSession, joinSession, message, receivedMsgs, username, showEmojiPicker,
    } = { ...this.state };
    return (
      <div id="psychick" className="chat-here">
        <div id="header" />
        <div style={{ padding: '10px' }}>
          <Skeleton active loading={playingTime === 0} paragraph={{ rows: 1 }}>
            <div>{nowPlaying}</div>
            <input readOnly className="time-disp" value={playingTime} />
          </Skeleton>
          <Row>
            <Button type="primary" onClick={(e) => this.createSession(e)}>Create Session</Button>
            <Button type="primary" onClick={(e) => this.joinSessionHandler(e)}>Join Session</Button>
          </Row>
          <Row>
            <input readOnly id="create-session-id" defaultValue={createdSession} />
            <input id="set-username" value={username} onChange={(e) => this.handleChange(e)} name="username" />
            <input id="join-session-id" type="text" name="joinSession" onChange={(e) => this.handleChange(e)} value={joinSession} />
          </Row>
        </div>
        <div id="chat-message-list">
          {receivedMsgs.map((messageData) => (
            <div className={`message-row ${messageData.from === username ? 'you-message' : 'other-message'}`}>
              {messageData.from !== username && <div className="message-from">{messageData.from}</div>}
              <div className="message-text">
                {messageData.message}
              </div>
            </div>
          ))}
        </div>

        <div className="message-form-wrapper">
          {showEmojiPicker && (
          <div className="emoji-picker-wrapper">
            <Picker
              native
              theme="dark"
              style={{ width: 'unset', margin: '10px' }}
              onSelect={(e) => this.addEmoji(e)}
              emojiTooltip
              showPreview={false}
              showSkinTones={false}
              useButton={false}
              sheetSize={16}
            />
          </div>
          )}
          <form className="send-message" onSubmit={(e) => this.sendMessage(e)} autoComplete="off">
            <span id="emoji-picker" onClick={(e) => this.showPicker(e)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0m0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10" />
                <path d="M8 7a2 2 0 1 0-.001 3.999A2 2 0 0 0 8 7M16 7a2 2 0 1 0-.001 3.999A2 2 0 0 0 16 7M15.232 15c-.693 1.195-1.87 2-3.349 2-1.477 0-2.655-.805-3.347-2H15m3-2H6a6 6 0 1 0 12 0" />
              </svg>
            </span>
            <input placeholder="Type a chat message" id="msg" type="text" name="message" onChange={(e) => this.handleChange(e)} value={message} />
          </form>
        </div>
      </div>
    );
  }
}
export default ChatBox;
// Oka
