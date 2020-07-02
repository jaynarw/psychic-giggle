import React from 'react';
import { Picker } from 'emoji-mart';
import enhanceWithClickOutside from 'react-click-outside';

class EmojiPicker extends React.Component {
  handleClickOutside() {
    this.props.toggle();
  }

  render() {
    return (
      <div className="emoji-picker-wrapper">
        <Picker
          native
          theme="dark"
          style={{ width: 'unset', margin: '10px' }}
          onSelect={(e) => this.props.addEmoji(e)}
          emojiTooltip
          showPreview={false}
          showSkinTones={false}
          useButton={false}
          sheetSize={16}
        />
      </div>
    );
  }
}
export default enhanceWithClickOutside(EmojiPicker);
