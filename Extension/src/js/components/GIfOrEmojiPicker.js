/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React from 'react';
import { Picker } from 'emoji-mart';
import enhanceWithClickOutside from 'react-click-outside';
import GiphySearchBoxWrapper from './GiphySearchBoxWrapper';

class GifOrEmojiPicker extends React.Component {
  handleClickOutside() {
    this.props.toggle();
  }

  render() {
    const { giphySearchIndex, handleGifSearchClick, handleGifSelection, addEmoji } = this.props;
    return (
      <div className={`emoji-picker-wrapper searchboxWrapper ${giphySearchIndex === 'emojis' ? 'padding-none' : ''}`}>
        <div className="emoji-bar-selection">
          <span data-target="gifs" className={giphySearchIndex === 'gifs' ? 'selected-picker' : ''} onClick={(e) => handleGifSearchClick(e)}>GIFs</span>
          <span data-target="stickers" className={giphySearchIndex === 'stickers' ? 'selected-picker' : ''} onClick={(e) => handleGifSearchClick(e)}>Stickers</span>
          <span data-target="emojis" className={giphySearchIndex === 'emojis' ? 'selected-picker' : ''} onClick={(e) => handleGifSearchClick(e)}>Emojis</span>
        </div>
        {giphySearchIndex !== 'emojis' && (
        <GiphySearchBoxWrapper
          giphySearchIndex={giphySearchIndex}
          handleGifSelection={(item) => handleGifSelection(item)}
        />
        )}
        {giphySearchIndex === 'emojis'
        && (
        <Picker
          native
          theme="dark"
          style={{ width: 'web' }}
        // style={{ width: 'unset', margin: '10px' }}
          onSelect={(e) => addEmoji(e)}
          emojiTooltip
          showPreview={false}
          showSkinTones={false}
          useButton={false}
          sheetSize={16}
        />
        )}
      </div>

    // </div>
    );
  }
}
export default enhanceWithClickOutside(GifOrEmojiPicker);
