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
    this.audioSocket.on('hangup', (msg) => this.handleHangUpMsg);
  }

  invite(evt) {
    const mediaConstraints = {
      audio: true,
      video: false,
    };
    const { liveCalls } = this.props;
    const clickedUsername = evt.target.getAttribute('name');
    console.log(evt.target);
    if (liveCalls[clickedUsername]) {
      console.log("You can't start a call because you already have one open!");
      if (liveCalls[clickedUsername].status === 'Disconnect') {
        liveCalls[clickedUsername].conn.hangUpCall();
        delete liveCalls[clickedUsername];
        this.props.updateLiveCalls(liveCalls);
      }
      // return;
    } else {
      if (clickedUsername === this.audioSocket.id) {
        console.log("I'm afraid I can't let you talk to yourself. That would be weird.");
        // return;
      }
      console.log(`clicked ${clickedUsername}`);
      const newPeer = new RTCPeer(clickedUsername, this.audioSocket, document.getElementById(`audio-${clickedUsername}`));
      navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then((localStream) => {
          localStream.getTracks().forEach((track) => newPeer.peerConnection.addTrack(track, localStream));
        })
        .catch(newPeer.handleGetUserMediaError);
      liveCalls[clickedUsername] = { conn: newPeer, status: 'Calling' };
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

    liveCalls[targetUsername] = { conn: newPeer, status: 'Offered a call' };
    this.props.updateLiveCalls(liveCalls);
  }

  handleAnswerMsg(msg) {
    const { liveCalls } = this.props;
    function log(text) {
      const time = new Date();
      console.log(`[${time.toLocaleTimeString()}] ${text}`);
    }
    log('*** Call recipient has accepted our call');
    function logError(text) {
      const time = new Date();
      console.trace(`[${time.toLocaleTimeString()}] ${text}`);
    }

    const answeredCall = liveCalls[msg.name].conn;
    const desc = new RTCSessionDescription(msg.sdp);
    answeredCall.peerConnection.setRemoteDescription(desc).catch((errMessage) => {
      logError(`Error ${errMessage.name}: ${errMessage.message}`);
    });
    liveCalls[msg.name].status = 'Voice Connected';
    this.props.updateLiveCalls(liveCalls);
  }

  handleHangUpMsg(msg) {
    const { liveCalls } = this.props;
    if (liveCalls[msg.name]) {
      liveCalls[msg.name].conn.closeCall();
      delete liveCalls[msg.name];
      this.props.updateLiveCalls(liveCalls);
    }
  }

  handleNewICECandidateMsg(msg) {
    const { liveCalls } = this.props;
    function log(text) {
      const time = new Date();
      console.log(`[${time.toLocaleTimeString()}] ${text}`);
    }
    log(`*** Candidates exchanged from ${msg.name}`);
    const call = liveCalls[msg.name].conn;
    call.handleNewICECandidateMsg(msg.candidate);
    if (liveCalls[msg.name].status === 'Offered a call') liveCalls[msg.name].status = 'Voice Connected';
    this.props.updateLiveCalls(liveCalls);
  }

  hoverCall(event) {
    const { liveCalls } = this.props;
    const hovered = event.target.getAttribute('name');
    if (liveCalls[hovered] && liveCalls[hovered].status === 'Voice Connected') {
      liveCalls[hovered].status = 'Disconnect';
      this.props.updateLiveCalls(liveCalls);
    }
  }

  exitHoverCall(event) {
    const { liveCalls } = this.props;
    const hovered = event.target.getAttribute('name');
    if (liveCalls[hovered] && liveCalls[hovered].status === 'Disconnect') {
      liveCalls[hovered].status = 'Voice Connected';
      this.props.updateLiveCalls(liveCalls);
    }
  }

  render() {
    const { onlineUsers, socket, liveCalls } = this.props;
    console.log(onlineUsers);
    return (
      <ul className="userlistbox">
        {onlineUsers.flatMap((user) => (
          (user.id === socket.id) ? []
            : [
              <li className="active-user" key={user.id}>
                {user.nickname}
                <span
                  className="enable-voice"
                  name={user.id}
                  onClick={(event) => this.invite(event)}
                  onMouseOver={(event) => this.hoverCall(event)}
                  onMouseOut={(event) => this.exitHoverCall(event)}
                >
                  {liveCalls[user.id] ? liveCalls[user.id].status : 'Connect with Voice'}
                </span>
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
