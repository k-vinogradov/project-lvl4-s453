import React from 'react';
import io from 'socket.io-client';
import { Row, Col } from 'react-bootstrap';
import { connect } from 'react-redux';
import Sidebar from './sidebar';
import Messages from './messages';
import MessageForm from './messageform';
import ChannelForm from './channelform';
import * as actions from '../actions';
import { getChannels, getMessages } from '../requests';

const actionCreators = {
  applyChannelSet: actions.applyChannelSet,
  updateMessages: actions.updateMessages,
  receiveNewChannel: actions.receiveNewChannel,
};

const mapStateToProps = ({ username }) => ({ username });

class App extends React.Component {
  componentDidMount() {
    const socket = io({ timeout: 20 });
    const { updateMessages, receiveNewChannel } = this.props;
    socket
      .on('newMessage', ({ data: { attributes } }) => {
        const { cid, id } = attributes;
        updateMessages({ cid, messages: { [id]: attributes } });
      })
      .on('newChannel', ({ data: { attributes } }) => {
        const { id } = attributes;
        console.log(attributes);
        receiveNewChannel({ cid: id, byCID: { [id]: attributes } });
        this.syncChanel(id);
      })

      // Reconnect means that we've been being offline for a while.
      // Makes sense to resynchronize the entire base to get missed updates
      .on('reconnect', this.syncAllChannels);
  }

  syncAllChannels = async () => {
    const { applyChannelSet } = this.props;
    try {
      const channels = await getChannels();
      applyChannelSet(channels);
      channels.allCIDs.forEach(this.syncChanel);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      setTimeout(this.syncAllChannels, 10000);
    }
  };

  syncChanel = async (cid) => {
    const { updateMessages } = this.props;
    try {
      const messages = await getMessages(cid);
      updateMessages({ cid, messages });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      setTimeout(() => this.syncChanel(cid), 10000);
    }
  };

  render() {
    const { username } = this.props;
    return (
      <React.Fragment>
        <Row>
          <Col>
            <h2 className="m-1">{username}</h2>
          </Col>
        </Row>
        <Row>
          <Col md={3}>
            <Sidebar />
          </Col>
          <Col>
            <Messages />
            <MessageForm />
          </Col>
        </Row>
        <ChannelForm />
      </React.Fragment>
    );
  }
}

export default connect(
  mapStateToProps,
  actionCreators,
)(App);
