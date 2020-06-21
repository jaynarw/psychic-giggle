/* eslint-disable react/prop-types */
import React from 'react';
import * as io from 'socket.io-client';
import {
  Skeleton, Layout, Row, Col, Button,
} from 'antd';
// import ChatTextArea from './ChatTextArea';
import 'antd/dist/antd.css';
import './chatbox.css';

const { Header, Content, Footer } = Layout;

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
      message: '',
      receivedMsgs: [],
    };
    this.socket = io('http://localhost');
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
      }
    }
    this.socket.on('msg-recieved', (data) => {
      const { receivedMsgs } = { ...this.state };
      receivedMsgs.push(data);
      this.setState({ receivedMsgs });
    });
    this.socket.on('perform sync', (data) => {
      const { currentVideo } = {...this.state};
      switch (data.type) {
        case 'PAUSE':
          currentVideo.pause();
          break;
        case 'PLAY':
          currentVideo.play();
          break;
        default:
          //do nothing
      }
    });
  }

  componentWillUnmount() {
    const { currentVideo } = { ...this.state };
    if (currentVideo) {
      currentVideo.removeEventListener('timeupdate', this.updatePlayingTime);
    }
  }

  handleVideoEvents(event) {
    switch (event.type) {
      case 'pause':
        this.socket.emit('client sync', {type : 'PAUSE'});
        break;
      case 'play':
        this.socket.emit('client sync', {type : 'PLAY'});
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
    this.socket.emit('join session', joinSession);
  }

  sendMessage(event) {
    const { message } = { ...this.state };
    event.preventDefault();
    this.socket.emit('msg', { message });
    this.setState({ message: '' });
  }

  render() {
    const {
      nowPlaying, playingTime, createdSession, joinSession, message, receivedMsgs,
    } = { ...this.state };
    return (
      <div id="psychick" className="chat-here">
        <Layout style={{ height: '100%' }}>
          <Header />
          <Content style={{ backgroundColor: 'white' }}>
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
              <input id="join-session-id" type="text" name="joinSession" onChange={(e) => this.handleChange(e)} value={joinSession} />
            </Row>
            {receivedMsgs.map((messageData) => <li>{messageData.message}</li>)}
          </Content>
          <form className="send-message" onSubmit={(e) => this.sendMessage(e)}>
            <input id="msg" type="text" name="message" onChange={(e) => this.handleChange(e)} value={message} />
          </form>
        </Layout>
      </div>
    );
  }
}
export default ChatBox;
