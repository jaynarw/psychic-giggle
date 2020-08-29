import React from 'react';
import {
  MdSearch,
} from 'react-icons/md';
import {
  makeStyles, createMuiTheme, ThemeProvider, useTheme,
} from '@material-ui/core/styles';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

function TabPanel(props) {
  const {
    children, value, index, ...other
  } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && (
        children
      )}
    </div>
  );
}

// TabPanel.propTypes = {
//   children: PropTypes.node,
//   index: PropTypes.any.isRequired,
//   value: PropTypes.any.isRequired,
// };

function a11yProps(index) {
  return {
    id: `full-width-tab-${index}`,
    'aria-controls': `full-width-tabpanel-${index}`,
    style: {
      fontSize: '12px',
    },
  };
}

const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      dark: '#9caae4',
      main: '#9caae4',
      contrastText: '#000',
    },
  },
  overrides: {
    MuiTab: {
      root: {
        minHeight: 32,
        height: 32,
        padding: '6px 0px',
      },
    },
    MuiTabs: {
      root: {
        minHeight: 32,
        height: 32,
      },
    },
  },
  typography: {
    fontFamily: [
      'RadikalBold',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
});

const useStyles = makeStyles((theme2) => {
  console.log('InuseStle');
  return ({
    root: {
      backgroundColor: theme2.palette.background.paper,
    },

  });
});


function FullWidthTabs(props) {
  // const classes = useStyles();
  const theme = useTheme();
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index) => {
    setValue(index);
  };

  function searchUser(e) {
    if (e.key === 'Enter') {
      props.searchUser();
    }
  }

  return (
    <div>
      <Tabs
        value={value}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        aria-label="full width tabs example"
        width={1}
      >
        <Tab label="Friends" {...a11yProps(0)} />
        <Tab label="Pending" {...a11yProps(1)} />
        <Tab label="Add Friend" {...a11yProps(2)} />
      </Tabs>
      {/* <SwipeableViews
          axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'}
          index={value}
          onChangeIndex={handleChangeIndex}
        > */}
      <TabPanel value={value} index={0} dir={theme.direction}>
        <div style={{ padding: '10px 4px 10px 4px' }}>
          {props.friends
        && props.friends.map((request) => (
          <div
            key={request.id}
            style={{
              display: 'flex', flexDirection: 'row', minHeight: '26px', padding: '3px 0',
            }}
            className="friend-invite"
          >
            <span className="friend-title">{request.name}</span>
            {props.isNowPlaying && <div className="round-primary-button" data-attr={request.id} onClick={(e) => props.sendInvite(e)}>Invite</div>}
          </div>
        ))}
        </div>
      </TabPanel>
      <TabPanel value={value} index={1} dir={theme.direction}>
        <div>
          <div style={{ padding: '10px 4px 10px 4px' }}>
            {props.friendRequests
              && props.friendRequests.map((request) => (
                <div style={{ display: 'flex', flexDirection: 'row', padding: '3px 0' }} key={request.id} className="friend-invite">
                  <span className="friend-title">{request.from}</span>
                  <div className="round-primary-button" data-attr={request.id} onClick={(e) => props.handleAcceptRequest(e)} style={{ marginRight: '8px' }}>Accept</div>
                  <div className="round-outline-button" data-attr={request.id} onClick={(e) => props.handleAcceptRequest(e)}>Decline</div>
                </div>
              ))}
          </div>
        </div>
      </TabPanel>
      <TabPanel value={value} index={2} dir={theme.direction}>
        <div className="friend-form">
          <label htmlFor="add-friend-username" style={{ fontFamily: 'Radikal', fontWeight: 'bolder' }}>Enter Username</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              id="add-friend-username"
              className="username-input"
              style={{ paddingRight: '24px', fontFamily: 'Radikal', fontWeight: 'normal' }}
              value={props.addContact}
              name="addContact"
              onKeyPress={(e) => searchUser(e)}
              onChange={(e) => props.handleInput(e)}
              disabled={props.searchStatus === 'Searching'}
              autoComplete="off"
            />
            <MdSearch
              style={{
                height: '20px', width: '20px', position: 'absolute', right: '5px', top: 'calc(50% - 10px)',
              }}
              onClick={() => {
                document.getElementById('add-friend-username').focus();
              }}
            />
          </div>
          <div className="search-status" style={{ padding: '10px 0' }}>
            {props.searchStatus === '' ? 'Press Enter to search' : ''}
            {props.searchStatus === 'Searching' ? 'Searching' : ''}
            {props.searchStatus === 'No user found' ? props.searchStatus : ''}
            {props.searchedUser && props.searchedUser.name === props.addContact && (
            // <div style={{ display: 'flex', flexDirection: 'row', padding: '3px 0' }} className="friend-invite">
            //   <span className="friend-title">{props.searchedUser.addContact}</span>
            //   <div className="round-primary-button" onClick={() => props.sendRequest(e)}>Add Friend</div>
            // </div>
              searchedUserToButton(props.searchedUser, props.sendRequest, props.handleAcceptRequest, props.addContactStatus)
            )}
          </div>
        </div>
      </TabPanel>
    </div>
  );
}

function searchedUserToButton(searchedUser, sendRequest, acceptRequest, addContactStatus) {
  console.log(searchedUserToButton);
  return (
    <div style={{ display: 'flex', flexDirection: 'row', padding: '3px 0' }} className="friend-invite">
      <span className="friend-title">{searchedUser.name}</span>
      {searchedUser.id && <div className="round-primary-button" data-attr={searchedUser.id} onClick={(e) => acceptRequest(e)}>Accept</div>}
      {!searchedUser.id && (
      <div
        className="round-primary-button"
        onClick={(e) => {
          if (!searchedUser.status && addContactStatus === '') sendRequest(e);
        }}
      >
        {searchedUser.status ? searchedUser.status : (addContactStatus === '' ? 'Add Friend' : addContactStatus)}
      </div>
      )}
    </div>
  );
}

function FullWidthTabsWrapper(props) {
  return (
    <ThemeProvider theme={theme}>
      <FullWidthTabs {...props} />
    </ThemeProvider>
  );
}

function FriendsCard(props) {
  return (
    <>
      {props.invites && props.invites.length > 0
      && (
      <>
        <div className="card-title">Recent activities</div>
        <div className="card-container">
          <div>
            <div style={{ padding: '10px 4px 10px 4px' }}>
              {props.invites && props.invites.length > 0
              && props.invites.map((inviteData, ind) => (
                <div key={inviteData.id} style={{ display: 'flex', flexDirection: 'row', padding: '3px 0' }} className="friend-invite">
                  <span className="friend-title">
                    {`${inviteData.from} invited you to watch ${inviteData.movie} on ${inviteData.provider}`}
                  </span>
                  <div>
                    <div
                      className="round-primary-button"
                      onClick={() => {
                        const updatedInvites = [...props.invites];
                        updatedInvites.splice(ind);
                        chrome.storage.local.set({ invites: updatedInvites });
                        props.acceptInvitation(inviteData);
                      }}
                      style={{ marginBottom: '8px' }}
                    >
                      Accept
                    </div>
                    <div
                      className="round-outline-button"
                      onClick={() => {
                        const updatedInvites = [...props.invites];
                        updatedInvites.splice(ind);
                        chrome.storage.local.set({ invites: updatedInvites });
                      }}
                    >
                      Reject
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
      )}
      <div className="card-title">Friends</div>
      <div className="card-container">
        {/* <div className="card-tabs">
            <div className="card-single-tab">Friends</div>
            <div className="card-single-tab">Pending</div>
            <div className="card-single-tab">Add Friend</div>
          </div> */}
        <FullWidthTabsWrapper {...props} />
      </div>
    </>
  );
}

export default FriendsCard;
