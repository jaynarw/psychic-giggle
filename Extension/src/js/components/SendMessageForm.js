/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/prop-types */
import React from 'react';
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete';
import { emojiIndex } from 'emoji-mart';
import GifOrEmojiPicker from './GIfOrEmojiPicker';

import '@webscopeio/react-textarea-autocomplete/style.css';
import 'emoji-mart/css/emoji-mart.css';

class SendMessageForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: '',
      showEmojiPicker: false,
      giphySearchIndex: 'gifs',
    };
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  handleChange(event) {
    const { socket } = this.props;
    const { target } = event;
    const { value, name } = target;
    this.setState({ [name]: value });
    if (name === 'message') {
      socket.emit('typing');
    }
  }

  handleKeyPress(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(event) {
    const { message } = { ...this.state };
    const { socket } = this.props;
    // event.preventDefault();
    if (message && message.trim().length > 0) socket.emit('msg', message);
    this.setState({ message: '' });
  }

  addEmoji(e) {
    const { message } = { ...this.state };
    this.setState({ message: `${message} ${e.native} ` });
  }

  togglePicker() {
    this.setState((prevState) => ({ showEmojiPicker: !prevState.showEmojiPicker }));
  }

  togglePickerButton(e) {
    const { showEmojiPicker } = { ...this.state };
    if (!showEmojiPicker) {
      this.setState({ showEmojiPicker: true });
    }
    e.stopPropagation();
  }

  handleGifSelection(gif) {
    const { socket } = this.props;
    this.setState((prevState) => ({
      showGiphySearch: !prevState.showGiphySearch,
      showEmojiPicker: !prevState.showEmojiPicker,
    }));
    console.log(gif, gif.id);
    socket.emit('gif msg', gif.id);
  }

  handleGifSearchClick(event) {
    const { target } = event;
    const { giphySearchIndex } = { ...this.state };
    const clickedIndex = target.getAttribute('data-target');
    if (clickedIndex !== giphySearchIndex) {
      this.setState({ giphySearchIndex: clickedIndex });
    }
  }

  render() {
    const {
      showEmojiPicker, giphySearchIndex, message,
    } = { ...this.state };
    return (
      <div className="message-form-wrapper">
        {/* {showEmojiPicker && (
          <EmojiPicker toggle={() => this.togglePicker()} addEmoji={(e) => this.addEmoji(e)} />
        )} */}
        {showEmojiPicker && (
          <GifOrEmojiPicker
            giphySearchIndex={giphySearchIndex}
            handleGifSearchClick={(e) => this.handleGifSearchClick(e)}
            handleGifSelection={(item) => this.handleGifSelection(item)}
            addEmoji={(e) => this.addEmoji(e)}
            // toggle={() => this.togglePicker()}
          />
        )}
        <form
          className="send-message"
          // onSubmit={(e) => this.sendMessage(e)}
          autoComplete="off"
        >
          <span id="emoji-picker" onClick={() => this.togglePicker()}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0m0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10" />
              <path d="M8 7a2 2 0 1 0-.001 3.999A2 2 0 0 0 8 7M16 7a2 2 0 1 0-.001 3.999A2 2 0 0 0 16 7M15.232 15c-.693 1.195-1.87 2-3.349 2-1.477 0-2.655-.805-3.347-2H15m3-2H6a6 6 0 1 0 12 0" />
            </svg>
          </span>
          {/* <input placeholder="Type a chat message" id="msg" type="text" name="message" onChange={(e) => this.handleChange(e)} value={message} /> */}
          <ReactTextareaAutocomplete
            // className="message-input my-textarea"
            name="message"
            id="msg"
            rows="1"
            value={message}
            loadingComponent={() => <span>Loading</span>}
            onKeyPress={this.handleKeyPress}
            onChange={(e) => this.handleChange(e)}
            boundariesElement={document.getElementById('psychick')}
            placeholder="Type a chat message"
            trigger={{
              ':': {
                dataProvider: (token) => emojiIndex.search(token).slice(0, 5).map((o) => ({
                  colons: o.colons,
                  native: o.native,
                })),
                component: ({ entity: { native, colons } }) => (
                  <div>{`${colons} ${native}`}</div>
                ),
                output: (item) => `${item.native}`,
              },
            }}
          />

        </form>
      </div>
    );
  }
}
export default SendMessageForm;
