import React from 'react';
import { Gif } from '@giphy/react-components';

function secondsToHms(d) {
  d = Number(d);
  const h = Math.floor(d / 3600);
  const m = Math.floor(d % 3600 / 60);
  const s = Math.floor(d % 3600 % 60);

  const hDisplay = h > 0 ? `${h}:` : '';
  const mDisplay = m > 0 ? `${`${m}`.padStart(2, '0')}:` : `${''.padStart(2, '0')}:`;
  const sDisplay = `${s}`.padStart(2, '0');
  return `${hDisplay}${mDisplay}${sDisplay}`;
}

function Message(props) {
  const { messageData, userId, giphyFetch } = props;
  function getStatusMessage(data) {
    switch (data.status) {
      case 'PAUSE':
        return (
          <div className="user-conn-row">
            <div className="user-joined-text">{`${data.nickname} paused the video.`}</div>
          </div>
        );
      case 'PLAY':
        return (
          <div className="user-conn-row">
            <div className="user-joined-text">{`${data.nickname} started playing the video.`}</div>
          </div>
        );
      case 'SEEKING':
        return (
          <div className="user-conn-row">
            <div className="user-joined-text">{`${data.nickname} seeked the video to ${secondsToHms(data.time)}`}</div>
          </div>
        );
      case 'BUFFER':
        return (
          <div className="user-conn-row">
            <div className="user-joined-text">{`${data.nickname} is buffering.`}</div>
          </div>
        );
      default:
        // Do Nothn
    }
    return null;
  }
  return (
    <>
      {messageData.joined && (
      <div className="user-conn-row">
        <div className="user-joined-text">{`${messageData.joined} joined`}</div>
      </div>
      )}
      {messageData.left && (
      <div className="user-conn-row">
        <div className="user-left-text">{`${messageData.left} left`}</div>
      </div>
      )}
      {messageData.status && (
        getStatusMessage(messageData)
      )}
      {messageData.gifData && (
        <div className={`message-row ${messageData.from === userId ? 'you-message' : 'other-message'}`}>
          {messageData.from !== userId && <div className="message-from">{messageData.nickname}</div>}
          <div className={messageData.gifData.is_sticker ? '' : 'message-text'}>
            <Gif gif={messageData.gifData} backgroundColor="#121212" hideAttribution noLink />
          </div>
        </div>
      )}
      {!messageData.joined
      && !messageData.left
      && !messageData.status
      && !messageData.gifData
      && (
      <div className={`message-row ${messageData.from === userId ? 'you-message' : 'other-message'}`}>
        {messageData.from !== userId && <div className="message-from">{messageData.nickname}</div>}
        <div className="message-text">
          {messageData.message}
        </div>
      </div>
      )}
    </>
  );
}
export default Message;
