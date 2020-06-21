/* eslint-disable class-methods-use-this */
/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import { Input } from 'antd';

const { TextArea } = Input;

class ChatTextArea extends React.Component {
  // constructor(props) {
  //   super(props);
  //   this.state = {
  //     message: "",
  //   };
  //   this.handleChange = this.handleChange.bind(this);
  // }

  // handleChange(event) {
  //   const { target } = event;
  //   const { value, name } = target;
  //   this.setState({ [name]: value });
  // }
  handleKeyPress(e) {
    if (e.key === 'Enter' && e.shiftKey) {
      document.getElementById('message-text').value += '\n';
    } else if (e.key === 'Enter') {
      document.getElementById('message-text').value = '';
    }
  }

  render() {
    return (<TextArea id="message-text" rows={4} onKeyPress={this.handleKeyPress} />);
  }
}
export default ChatTextArea;
