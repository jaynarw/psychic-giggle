/* eslint-disable max-len */
/* eslint-disable no-alert */
/* eslint-disable jsx-a11y/media-has-caption */
import React from 'react';
import RTCPeer from '../modules/RTCPeer';

class VoiceChatter extends React.Component {
  constructor(props) {
    super(props);
    console.log('Voice chatter was constructed');
    this.audioSocket = this.props.socket;
    this.audioSocket.on('offer', (msg) => this.handleOfferMsg(msg));
    this.audioSocket.on('candidate', (msg) => this.handleNewICECandidateMsg(msg));
    this.audioSocket.on('answer', (msg) => this.handleAnswerMsg(msg));
    // this.audioSocket.on('hangup', handleHangUpMsg);
  }

  invite(evt) {
    const mediaConstraints = {
      audio: true,
      video: false,
    };
    const { liveCalls } = this.props;
    const clickedUsername = evt.target.getAttribute('name');
    if (liveCalls[clickedUsername]) {
      console.log("You can't start a call because you already have one open!");
      // return;
    } else {
      if (clickedUsername === this.audioSocket.id) {
        console.log("I'm afraid I can't let you talk to yourself. That would be weird.");
        // return;
      }

      const newPeer = new RTCPeer(clickedUsername, this.audioSocket, document.getElementById(`audio-${clickedUsername}`));
      navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then((localStream) => {
          localStream.getTracks().forEach((track) => newPeer.peerConnection.addTrack(track, localStream));
        })
        .catch(newPeer.handleGetUserMediaError);
      liveCalls[clickedUsername] = newPeer;
      this.props.updateLiveCalls(liveCalls);
    }
  }

  handleOfferMsg(msg) {
    const { liveCalls, socket } = this.props;
    const time = new Date();
    console.log(`[${time.toLocaleTimeString()}] ${msg.name} Offering a call`);

    const targetUsername = msg.name;
    const mediaConstraints = {
      audio: true,
      video: false,
    };

    const newPeer = new RTCPeer(targetUsername, this.audioSocket, document.getElementById(`audio-${targetUsername}`));

    const desc = new RTCSessionDescription(msg.sdp);

    newPeer.peerConnection.setRemoteDescription(desc).then(() => navigator.mediaDevices.getUserMedia(mediaConstraints))
      .then((stream) => {
        stream.getTracks().forEach((track) => newPeer.peerConnection.addTrack(track, stream));
      })
      .then(() => newPeer.peerConnection.createAnswer())
      .then((answer) => newPeer.peerConnection.setLocalDescription(answer))
      .then(() => {
        this.audioSocket.emit('answer', {
          target: targetUsername,
          sdp: newPeer.peerConnection.localDescription,
        });
      })
      .catch(newPeer.handleGetUserMediaError);

    liveCalls[targetUsername] = newPeer;
    this.props.updateLiveCalls(liveCalls);
  }

  handleAnswerMsg(msg) {
    function log(text) {
      const time = new Date();
      console.log(`[${time.toLocaleTimeString()}] ${text}`);
    }
    log('*** Call recipient has accepted our call');
    function logError(text) {
      const time = new Date();
      console.trace(`[${time.toLocaleTimeString()}] ${text}`);
    }

    // Configure the remote description, which is the SDP payload
    // in our "video-answer" message.

    const answeredCall = this.props.liveCalls[msg.name];
    const desc = new RTCSessionDescription(msg.sdp);
    answeredCall.peerConnection.setRemoteDescription(desc).catch((errMessage) => {
      logError(`Error ${errMessage.name}: ${errMessage.message}`);
    });
  }

  handleNewICECandidateMsg(msg) {
    function log(text) {
      const time = new Date();
      console.log(`[${time.toLocaleTimeString()}] ${text}`);
    }
    log(`*** Candidates exchanged from ${msg.name}`);
    const call = this.props.liveCalls[msg.name];
    call.handleNewICECandidateMsg(msg.candidate);
  }

  render() {
    const { onlineUsers, socket } = this.props;
    console.log(onlineUsers);
    return (
      <ul className="userlistbox">
        {onlineUsers.flatMap((user) => (
          (user.id === socket.id) ? []
            : [
              <li className="active-user" key={user.id} name={user.id} onClick={(event) => this.invite(event)}>
                {user.nickname}
                <span className="enable-voice">Enable voice</span>
              </li>]
        ))}
        {onlineUsers.flatMap((user) => (
          (user.id === socket.id) ? []
            : [
              <audio
                key={user.id}
                id={`audio-${user.id}`}
                controls
                autoPlay
                style={{ display: 'none' }}
              />,
            ]
        ))}
      </ul>
    );
  }
}
export default VoiceChatter;
