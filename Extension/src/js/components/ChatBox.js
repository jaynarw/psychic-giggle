/* eslint-disable react/prop-types */
import React from 'react';
import { Skeleton, Layout } from 'antd';
import 'antd/dist/antd.css';
import './chatbox.css';

const { Header, Content } = Layout;

class ChatBox extends React.Component {
  constructor(props) {
    super(props);
    const { nowPlaying } = this.props;
    this.state = {
      nowPlaying,
      playingTime: 0,
      currentVideo: null,
    };
    this.updatePlayingTime = this.updatePlayingTime.bind(this);
  }

  componentDidMount() {
    const [sdk] = document.getElementsByClassName('webPlayerSDKContainer');
    if (sdk) {
      const [video] = sdk.getElementsByTagName('video');
      if (video) {
        this.setState({ currentVideo: video });
        video.addEventListener('timeupdate', this.updatePlayingTime);
      }
    }
  }

  componentWillUnmount() {
    const { currentVideo } = { ...this.state };
    if (currentVideo) {
      currentVideo.removeEventListener('timeupdate', this.updatePlayingTime);
    }
  }

  updatePlayingTime(event) {
    this.setState({ playingTime: event.target.currentTime });
  }

  render() {
    const { nowPlaying, playingTime } = { ...this.state };
    return (
      <div id="psychick" className="chat-here">
        <Layout>
          <Header />
          <Content style={{ backgroundColor: 'white' }}>
            <Skeleton active loading={playingTime === 0} paragraph={{ rows: 1 }}>
              <div>{nowPlaying}</div>
              <input readOnly className="time-disp" value={playingTime} />
            </Skeleton>
          </Content>
        </Layout>
      </div>
    );
  }
}
export default ChatBox;
