import React from 'react';
import ReactGiphySearchBox from 'react-giphy-searchbox';

class GiphySearchBoxWrapper extends React.Component {
  shouldComponentUpdate(nextProps) {
    const differentIndex = this.props.giphySearchIndex !== nextProps.giphySearchIndex;
    return differentIndex;
  }

  render() {
    const { handleGifSelection, giphySearchIndex } = this.props;
    return (
      <ReactGiphySearchBox
        apiKey="lwiMnpcorQHdFIivZg43l3BJfJRlzdYO"
        onSelect={(item) => handleGifSelection(item)}
        library={giphySearchIndex}
        searchPlaceholder={`Search for ${giphySearchIndex.charAt(0).toUpperCase() + giphySearchIndex.slice(1)}`}
        masonryConfig={[
          { columns: 2, imageWidth: 110, gutter: 5 },
        ]}
        listWrapperClassName="listWrapper"
        listItemClassName="imageButton"
        wrapperClassName="emoji-mart-dark giphy-wrapper"
        searchFormClassName="emoji-mart-search horizontal-padding-none"
        poweredByGiphyImage={chrome.runtime.getURL('img/PoweredBy_200px-Black_HorizText.png')}
      />
    );
  }
}
export default GiphySearchBoxWrapper;
