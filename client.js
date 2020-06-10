function setMessages(msgArr, from) {
  msgArr.forEach((msg) => {
    setNewMessage(msg, from);
  });
}
function setNewMessage(msg, from) {
  const msgContainer = document.getElementById('message-container');
  const newMsgElt = document.createElement('li');
  if (msg.from !== from) {
    const avatar = document.createElement('i');
    avatar.textContent = 'person';
    avatar.classList.add('material-icons', 'circle');
    newMsgElt.appendChild(avatar);
  }
  const content = document.createElement('p');
  content.textContent = msg.message;

  newMsgElt.appendChild(content);
  newMsgElt.classList.add('collection-item', 'avatar');
  if (msg.from === from) newMsgElt.classList.add('right-align');
  msgContainer.appendChild(newMsgElt);
}
