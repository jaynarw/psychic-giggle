class RTCPeer {
  constructor(targetUsername, audioSocket, remoteAudio) {
    this.audioSocket = audioSocket;
    this.targetUsername = targetUsername;
    this.remoteAudio = remoteAudio;
    this.peerConnection = new RTCPeerConnection({
      iceServers: [ // Information about ICE servers - Use your own!
        {
          urls: 'stun:stun.stunprotocol.org',
        },
      ],
    });
    this.peerConnection.onicecandidate = this.handleICECandidateEvent.bind(this);
    this.peerConnection.ontrack = this.handleTrackEvent.bind(this);
    this.peerConnection.onnegotiationneeded = this.handleNegotiationNeededEvent.bind(this);
    this.peerConnection.onremovetrack = this.handleRemoveTrackEvent.bind(this);
    this.peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent.bind(this);
    this.peerConnection.onicegatheringstatechange = this.handleICEGatheringStateChangeEvent.bind(this);
    this.peerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent.bind(this);
  }

  handleICECandidateEvent(event) {
    if (event.candidate) {
      this.audioSocket.emit('candidate', {
        target: this.targetUsername,
        candidate: event.candidate,
      });
    }
  }

  handleTrackEvent(event) {
    [this.remoteAudio.srcObject] = event.streams;
  }

  handleNegotiationNeededEvent() {
    this.peerConnection.createOffer().then((offer) => this.peerConnection.setLocalDescription(offer))
      .then(() => {
        this.audioSocket.emit('offer', {
          target: this.targetUsername,
          sdp: this.peerConnection.localDescription,
        });
      })
      .catch(this.reportError);
  }

  handleRemoveTrackEvent(event) {
    const stream = this.remoteAudio.srcObject;
    const trackList = stream.getTracks();

    if (trackList.length === 0) {
      this.closeCall();
    }
  }

  handleICEConnectionStateChangeEvent(event) {
    switch (this.peerConnection.iceConnectionState) {
      case 'closed':
      case 'failed':
      case 'disconnected':
        this.closeCall();
        break;
      default:
            // Do nothing
    }
  }

  handleICEGatheringStateChangeEvent(event) {
    console.log('State change');
    // Our sample just logs information to console here,
    // but you can do whatever you need.
  }

  handleSignalingStateChangeEvent(event) {
    switch (this.peerConnection.signalingState) {
      case 'closed':
        this.closeCall();
        break;
      default:
            // DO nothing
    }
  }

  closeCall() {
    const { remoteAudio, peerConnection } = this;

    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.onremovetrack = null;
      peerConnection.onremovestream = null;
      peerConnection.onicecandidate = null;
      peerConnection.oniceconnectionstatechange = null;
      peerConnection.onsignalingstatechange = null;
      peerConnection.onicegatheringstatechange = null;
      peerConnection.onnegotiationneeded = null;

      if (remoteAudio.srcObject) {
        remoteAudio.srcObject.getTracks().forEach((track) => track.stop());
      }

      peerConnection.close();
      this.peerConnection = null;
    }

    remoteAudio.removeAttribute('src');
    remoteAudio.removeAttribute('srcObject');
    this.targetUsername = null;
  }

  handleNewICECandidateMsg(candidate) {
    const iceCandidate = new RTCIceCandidate(candidate);
    this.peerConnection.addIceCandidate(iceCandidate)
      .catch(this.reportError);
  }

  hangUpCall() {
    this.closeCall();
    this.audioSocket.emit('hangup', {
      target: this.targetUsername,
    });
  }

  handleGetUserMediaError(e) {
    switch (e.name) {
      case 'NotFoundError':
        alert('Unable to open your call because no camera and/or microphone'
              + 'were found.');
        break;
      case 'SecurityError':
      case 'PermissionDeniedError':
        // Do nothing; this is the same as the user canceling the call.
        break;
      default:
        alert(`Error opening your camera and/or microphone: ${e.message}`);
        break;
    }

    this.closeCall();
  }
}
export default RTCPeer;
