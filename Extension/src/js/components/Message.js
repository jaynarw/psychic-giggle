import React from 'react';

function Message(props) {
  const { messageData, userId } = props;
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
      {!messageData.joined && !messageData.left
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
