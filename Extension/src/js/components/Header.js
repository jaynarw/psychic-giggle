import React from 'react';
import Logo from './Logo';

function Header(props) {
  const imageSrc = chrome.runtime.getURL('img/minimal-desaturated.svg');
  function hoverLogo(e) {
    const ref = document.querySelector('.logo-bingebox');
    ref.classList.remove('animated');
    void ref.offsetWidth;
    ref.classList.add('animated');
  }
  return (
    <div className="header-bingebox .BoxShadowHelper-4">
      <link
        href="https://fonts.googleapis.com/css2?family=Righteous&display=swap"
        rel="stylesheet"
      />
      <div className="logo-bingebox" onMouseEnter={hoverLogo}>
        {/* <svg
          className="popcorn-logo"
          src={imageSrc}
          alt="Bingebox Logo"
        /> */}
        <Logo />
        <span className="binge">binge</span>
        <span className="box">box</span>
      </div>
    </div>
  );
}
export default Header;
