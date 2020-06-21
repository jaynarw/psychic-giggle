import React from 'react';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
    };
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    const { target } = event;
    const { value, name } = target;
    this.setState({ [name]: value });
  }

  render() {
    return (
      <form action="http://localhost/signup" method="post">
        <label>
          Name:
          <input type="text" name="username" onChange={this.handleChange} value={this.state.username} />
        </label>
        <label>
          Password:
          <input type="password" name="password" onChange={this.handleChange} value={this.state.password} />
        </label>
        <input type="submit" value="Submit" />
      </form>
    );
  }
}
export default App;
