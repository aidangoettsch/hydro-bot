'use strict';

const EventEmitter = require('events');
const util = require('util');
const Speaking = require('../../../util/Speaking');
const secretbox = require('../util/Secretbox');
const VideoDispatcher = require("../dispatcher/VideoDispatcher");
const { SILENCE_FRAME } = require('../util/Silence');

// The delay between packets when a user is considered to have stopped speaking
// https://github.com/discordjs/discord.js/issues/3524#issuecomment-540373200
const DISCORD_SPEAKING_DELAY = 250;

class Readable extends require('stream').Readable {
  _read() {} // eslint-disable-line no-empty-function
}

class PacketHandler extends EventEmitter {
  constructor(receiver) {
    super();
    this.nonce = Buffer.alloc(24);
    this.receiver = receiver;
    this.streams = new Map();
    this.speakingTimeouts = new Map();
  }

  get connection() {
    return this.receiver.connection;
  }

  _stoppedSpeaking(userID) {
    const streamInfo = this.streams.get(userID);
    if (streamInfo && streamInfo.end === 'silence') {
      this.streams.delete(userID);
      streamInfo.stream.push(null);
    }
  }

  makeStream(user, end) {
    if (this.streams.has(user)) return this.streams.get(user).stream;
    const stream = new Readable();
    stream.on('end', () => this.streams.delete(user));
    this.streams.set(user, { stream, end });
    return stream;
  }

  parseBuffer(buffer) {
    const { secret_key, mode } = this.receiver.connection.authentication;

    // Choose correct nonce depending on encryption
    let end;
    if (mode === 'xsalsa20_poly1305_lite') {
      buffer.copy(this.nonce, 0, buffer.length - 4);
      end = buffer.length - 4;
    } else if (mode === 'xsalsa20_poly1305_suffix') {
      buffer.copy(this.nonce, 0, buffer.length - 24);
      end = buffer.length - 24;
    } else {
      buffer.copy(this.nonce, 0, 0, 12);
    }

    // Open packet
    let packet = secretbox.methods.open(buffer.slice(12, end), this.nonce, secret_key);
    if (!packet) return new Error('Failed to decrypt voice packet');
    packet = Buffer.from(packet);

    // Strip RTP Header Extensions (one-byte only)
    if (packet[0] === 0xbe && packet[1] === 0xde && packet.length > 4) {
      const headerExtensionLength = packet.readUInt16BE(2);
      let offset = 4;
      for (let i = 0; i < headerExtensionLength; i++) {
        const byte = packet[offset];
        offset++;
        if (byte === 0) continue;
        offset += 1 + (0b1111 & (byte >> 4));
      }
      // Skip over undocumented Discord byte
      offset++;

      packet = packet.slice(offset);
    }

    return packet;
  }

  _parseRTCPPacket(packet) {
    const firstByte = packet[0];

    const { secret_key, mode } = this.receiver.connection.authentication;

    // Choose correct nonce depending on encryption
    let end;
    if (mode === 'xsalsa20_poly1305_lite') {
      packet.copy(this.nonce, 0, packet.length - 4);
      end = packet.length - 4;
    } else if (mode === 'xsalsa20_poly1305_suffix') {
      packet.copy(this.nonce, 0, packet.length - 24);
      end = packet.length - 24;
    } else {
      packet.copy(this.nonce, 0, 0, 12);
    }

    let data = secretbox.methods.open(packet.slice(8, end), this.nonce, secret_key);
    if (!data) return new Error('Failed to decrypt voice packet');
    data = Buffer.from(data);

    return {
      version: firstByte >> 6,
      padding: !!((firstByte >> 5) & 1),
      reportCount: firstByte & 0b11111,
      payloadType: packet[1],
      ssrc: packet.readUInt32BE(4),
      data,
    };
  }

  push(buffer) {
    const meta = VideoDispatcher._parseRTPPacket(buffer);
    if (meta.payloadType >= 71 && meta.payloadType <= 78 && this.connection.videoPlayer.dispatcher) {
      this.connection.videoPlayer.dispatcher.handleRTCP(this._parseRTCPPacket(buffer));
      return;
    }
    const userStat = this.connection.ssrcMap.get(meta.ssrc);
    if (!userStat) return;

    let opusPacket;
    const streamInfo = this.streams.get(userStat.userID);
    // If the user is in video, we need to check if the packet is just silence
    if (userStat.hasVideo) {
      opusPacket = this.parseBuffer(buffer);
      if (opusPacket instanceof Error) {
        // Only emit an error if we were actively receiving packets from this user
        if (streamInfo) {
          this.emit('error', opusPacket);
          return;
        }
      }
      if (SILENCE_FRAME.equals(opusPacket)) {
        // If this is a silence frame, pretend we never received it
        return;
      }
    }

    let speakingTimeout = this.speakingTimeouts.get(meta.ssrc);
    if (typeof speakingTimeout === 'undefined') {
      // Ensure at least the speaking bit is set.
      // As the object is by reference, it's only needed once per client re-connect.
      if (userStat.speaking === 0) {
        userStat.speaking = Speaking.FLAGS.SPEAKING;
      }
      this.connection.onSpeaking({ user_id: userStat.userID, ssrc: meta.ssrc, speaking: userStat.speaking });
      speakingTimeout = this.receiver.connection.client.setTimeout(() => {
        try {
          this.connection.onSpeaking({ user_id: userStat.userID, ssrc: meta.ssrc, speaking: 0 });
          this.receiver.connection.client.clearTimeout(speakingTimeout);
          this.speakingTimeouts.delete(meta.ssrc);
        } catch {
          // Connection already closed, ignore
        }
      }, DISCORD_SPEAKING_DELAY);
      this.speakingTimeouts.set(meta.ssrc, speakingTimeout);
    } else {
      speakingTimeout.refresh();
    }

    if (streamInfo) {
      const { stream } = streamInfo;
      if (!opusPacket) {
        opusPacket = this.parseBuffer(buffer);
        if (opusPacket instanceof Error) {
          this.emit('error', opusPacket);
          return;
        }
      }
      stream.push(opusPacket);
    }
  }
}

module.exports = PacketHandler;
