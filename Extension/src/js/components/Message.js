import React from 'react';

function Message(props) {
  const { messageData, username } = props;
  return (
    <div className={`message-row ${messageData.from === username ? 'you-message' : 'other-message'}`}>
      {messageData.from !== username && <div className="message-from">{messageData.from}</div>}
      <div className="message-text">
        {messageData.message}
      </div>
    </div>
  );
}
export default Message;
