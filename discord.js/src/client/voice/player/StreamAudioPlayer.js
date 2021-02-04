'use strict';

const BasePlayer = require('./BasePlayer');
const StreamConnection = require('../StreamConnection');

/**
 * An Audio Player for a Voice Connection.
 * @private
 * @extends {BasePlayer}
 */
class StreamAudioPlayer extends BasePlayer {
  constructor(voiceConnection) {
    super();
    /**
     * The voice connection that the player serves
     * @type {VoiceConnection}
     */
    this.voiceConnection = voiceConnection;
  }

  playBroadcast(broadcast, options) {
    const dispatcher = this.createDispatcher(options, {
      broadcast,
      live: this.voiceConnection instanceof StreamConnection,
    });
    broadcast.add(dispatcher);
    return dispatcher;
  }
}

module.exports = StreamAudioPlayer;
