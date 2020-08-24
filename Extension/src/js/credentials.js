import React from 'react';
import ReactDOM from 'react-dom';
import './components/popup.css';
import superagent from 'superagent';

class PopupApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      token: null,
      username: '',
      password: '',
      loginError: '',
      addContact: '',
      loggedInUser: null,
      contacts: null,
      addContactMsg: '',
    };
  }

  componentDidMount() {
    chrome.storage.local.get(['token', 'username'], (result) => {
      if (result.token) {
        this.setState({ token: result.token });
      }
      if (result.username) {
        this.setState({ loggedInUser: result.username });
      }
    });
  }

  handleInput(e) {
    const { target } = e;
    const { name, value } = target;
    this.setState({ [name]: value });
  }

  loginHandler() {
    const { username, password } = { ...this.state };
    if (username.length > 0 && password.length > 0) {
      superagent.post('https://0297f2e82338.ngrok.io/login').send({
        username,
        password,
      }).ok((res) => res.status < 500).then((res) => {
        if (typeof res.body === 'object') {
          if (res.body.success) {
            chrome.storage.local.set({ token: res.body.token, username }, () => {
              chrome.runtime.sendMessage({ type: 'LoggedIn' });
              this.setState({
                token: res.body.token, loggedInUser: username, username: '', password: '',
              });
            });
          } else {
            this.setState({ loginError: res.body.msg });
          }
        }
      });
    }
  }

  hoverLogo() {
    const ref = document.querySelector('#logo-chat');
    ref.classList.remove('animated');
    void ref.offsetWidth;
    ref.classList.add('animated');
  }

  logoutUser() {
    const { token } = { ...this.state };
    chrome.storage.local.get(['regToken'], (result) => {
      if (result.regToken) {
        superagent.post('https://0297f2e82338.ngrok.io/logout')
          .send({ regToken: result.regToken })
          .set('Authorization', token)
          .then((res) => {
            if (res.ok) {
              chrome.storage.local.remove(['token', 'username', 'regToken'], () => {
                this.setState({ token: null, loggedInUser: null });
              });
            }
          });
      } else {
        superagent.post('https://0297f2e82338.ngrok.io/logout')
          .set('Authorization', token)
          .then((res) => {
            if (res.ok) {
              chrome.storage.local.remove(['token', 'username', 'regToken'], () => {
                this.setState({ token: null, loggedInUser: null });
              });
            }
          });
      }
    });
  }

  addContact() {
    const { addContact, token } = { ...this.state };
    if (addContact.length > 0) {
      superagent.post('https://0297f2e82338.ngrok.io/sendRequest').send({
        contactToAdd: addContact,
      }).set('Authorization', token).ok((res) => res.status < 500)
        .then((res) => {
          if (res.body && res.body.success) {
            this.setState({ addContactMsg: res.body.msg });
          } else {
            this.setState({ addContactMsg: res.body.msg });
          }
        });
    }
  }

  render() {
    const {
      token, username, password, loginError, loggedInUser, addContact, contacts, addContactMsg,
    } = { ...this.state };
    return (
      <>
        <div>
          <div className="logo-bingebox animated logo-chat" id="logo-chat" onMouseEnter={() => this.hoverLogo()}>
            <svg className="popcorn-logo-chat" version="1.0" xmlns="http://www.w3.org/2000/svg" width="298px" height="472px" viewBox="0 0 2980 4720" preserveAspectRatio="xMidYMid meet">
              <g id="layer101" fill="rgba(255,255,255,0.88)" stroke="none">
                <path d="M575 4690 c-3 -14 -18 -115 -35 -225 -16 -110 -138 -902 -270 -1760 -132 -858 -240 -1576 -240 -1596 0 -72 -7 -69 191 -69 l179 0 -5 38 c-3 20 24 276 58 567 l64 530 -32 65 c-166 333 -149 751 42 1065 39 65 132 188 145 193 4 2 8 22 8 45 1 23 12 128 25 232 30 236 100 924 94 929 -2 2 -52 6 -111 8 l-108 3 -5 -25z" />
                <path d="M1168 4713 c-65 -2 -118 -5 -118 -7 0 -2 -13 -158 -29 -347 -17 -189 -33 -398 -36 -464 -4 -66 -13 -132 -20 -147 -12 -24 -11 -26 4 -18 40 22 130 59 171 71 25 7 50 16 55 20 6 4 33 10 60 14 28 4 57 9 66 11 13 4 17 49 27 322 7 174 16 370 19 435 l6 117 -44 -2 c-24 -1 -97 -4 -161 -5z" />
                <path d="M1650 4713 c11 -270 27 -859 25 -864 -3 -3 21 -9 52 -13 31 -4 61 -10 67 -15 6 -4 34 -14 61 -21 28 -7 59 -19 70 -27 11 -7 27 -13 36 -13 9 0 34 -12 55 -26 21 -15 33 -20 26 -11 -12 14 -28 209 -52 647 -5 96 -12 214 -16 263 l-6 87 -159 0 c-87 0 -159 -3 -159 -7z" />
                <path d="M2190 4718 c0 -4 42 -353 95 -792 25 -208 45 -383 45 -387 0 -5 9 -9 20 -9 17 0 20 -7 20 -39 0 -29 10 -54 43 -100 48 -70 92 -144 108 -181 6 -14 17 -38 24 -55 8 -16 19 -48 25 -70 6 -22 16 -50 22 -62 6 -13 8 -26 5 -30 -4 -3 -1 -13 6 -21 17 -21 17 -476 0 -493 -6 -6 -9 -18 -6 -25 3 -8 1 -20 -4 -27 -6 -6 -16 -34 -23 -62 -7 -27 -19 -59 -27 -70 -7 -11 -13 -26 -13 -35 0 -9 -11 -31 -23 -50 -19 -27 -22 -40 -15 -65 10 -38 120 -983 121 -1047 l1 -48 125 0 c69 0 149 3 178 6 65 8 67 17 42 178 -10 67 -57 373 -104 681 -47 308 -116 763 -154 1010 -39 248 -92 601 -120 785 -28 184 -73 484 -101 665 -27 182 -50 333 -50 338 0 4 -54 7 -120 7 -66 0 -120 -1 -120 -2z" />
                <path d="M1116 3338 c-14 -20 -16 -94 -16 -610 0 -322 4 -597 9 -610 12 -31 56 -55 74 -40 7 6 40 25 72 42 86 44 156 85 163 96 4 5 36 23 72 39 36 17 70 35 75 41 13 14 95 61 168 96 31 16 57 31 57 36 0 9 58 42 74 42 7 0 22 9 33 19 12 11 36 27 54 35 38 17 138 74 223 126 52 32 56 38 56 71 0 31 -4 38 -25 43 -14 4 -25 11 -25 16 0 5 -15 16 -32 25 -18 8 -40 19 -48 24 -71 47 -222 131 -234 131 -8 0 -19 6 -23 13 -8 13 -64 46 -195 116 -32 17 -67 40 -78 51 -11 11 -26 20 -34 20 -8 0 -50 22 -93 49 -43 26 -106 63 -140 81 -35 17 -63 35 -63 39 0 12 -49 31 -80 31 -18 0 -34 -8 -44 -22z" />
                <path d="M823 1771 c-2 -48 -31 -439 -48 -653 l-5 -68 256 0 c240 0 256 1 249 18 -3 9 -3 135 1 280 6 230 9 262 23 263 9 0 -22 11 -69 24 -144 39 -245 83 -350 155 l-55 37 -2 -56z" />
                <path d="M2135 1794 c-108 -77 -259 -140 -415 -173 -31 -6 -32 -8 -12 -13 22 -6 22 -8 24 -220 2 -117 3 -241 2 -275 l-1 -63 244 0 c188 0 243 3 243 13 0 8 4 7 10 -3 7 -10 8 -1 5 30 -14 118 -55 723 -50 731 10 15 3 11 -50 -27z" />
                <path d="M111 993 l-73 -4 4 -37 c4 -28 0 -44 -19 -65 -16 -20 -23 -41 -23 -72 0 -36 5 -47 32 -70 27 -23 39 -26 75 -22 27 3 46 0 53 -8 5 -6 28 -20 49 -30 30 -13 41 -24 45 -49 7 -36 44 -79 88 -102 22 -12 47 -15 87 -11 47 4 65 0 111 -22 48 -23 68 -26 162 -27 l107 -1 27 -32 c32 -38 94 -75 154 -92 l45 -12 -32 -9 c-112 -30 -89 -198 27 -198 37 0 49 -7 97 -50 39 -36 70 -55 111 -66 66 -20 162 -15 211 10 26 14 39 15 63 7 100 -35 208 21 233 120 l7 27 46 -15 c64 -20 175 -13 228 15 29 15 51 19 81 15 85 -11 151 54 140 139 -3 22 -15 50 -26 62 -12 12 -21 29 -21 38 0 13 6 14 53 1 65 -18 146 -10 207 19 62 30 133 104 155 161 22 58 51 64 79 16 29 -50 109 -74 159 -48 69 36 97 100 73 170 -14 39 -13 45 6 83 11 22 23 69 26 103 l5 63 -1389 -2 c-764 -1 -1422 -4 -1463 -5z" />
              </g>
            </svg>
            <span className="binge">binge</span>
            <span className="box">box</span>
          </div>
        </div>
        {!token
          && (
          <>
            <div className="centered-flex">
              <div className="card-psychic">
                <div className="error-desc">{loginError}</div>
                <label htmlFor="username">Username</label>
                <input name="username" className="username-input" id="username" type="text" value={username} required onChange={(e) => this.handleInput(e)} />
                <label htmlFor="password">Password</label>
                <input name="password" className="username-input" id="password" type="password" value={password} required onChange={(e) => this.handleInput(e)} />
                <button type="button" className="session-button" onClick={() => this.loginHandler()}>Login</button>
              </div>
            </div>
            <div className="centered-flex">
              <div className="or-divider" style={{ width: '90%', margin: '0 0 8px 0' }}>Or</div>
            </div>

            <div className="centered-flex">
              <button type="button" className="outlined-button" style={{ width: '90%' }}>Signup</button>
            </div>

          </>
          )}
        {token && (
        <>
          <div>
            {`Welcome ${loggedInUser}!`}
          </div>
          <div>
            {addContactMsg}
            <input type="text" name="addContact" value={addContact} onChange={(e) => this.handleInput(e)} />
            <button type="button" onClick={() => this.addContact()}>Add to Contact</button>
          </div>
          <div>{contacts && contacts.map((contact) => (<li>{contact}</li>))}</div>
          <button type="button" onClick={() => this.logoutUser()}>Logout</button>
        </>
        )}
      </>
    );
  }
}
ReactDOM.render(<PopupApp />, document.getElementById('popup-app'));