import React from 'react';
import * as io from 'socket.io-client';

class VoiceChatter extends React.Component {
  constructor(props) {
    super(props);
    this.audioSocket = io('http://localhost/audio');
  }

  render() {
    return ();
  }

}
export default VoiceChatter;
