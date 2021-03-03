'use strict';

const { Writable } = require('stream');
const util = require('util');
const secretbox = require('../util/Secretbox');

const MTU = 1330;
const MAX_NONCE_SIZE = 2 ** 32 - 1;
const nonce = Buffer.alloc(24);
const RTP_PERIOD = BigInt(Math.floor(1000000000 / 90000));

/**
 * @external WritableStream
 * @see {@link https://nodejs.org/api/stream.html#stream_class_stream_writable}
 */

/**
 * The class that sends voice packet data to the voice connection.
 * ```js
 * // Obtained using:
 * voiceChannel.join().then(connection => {
 *   // You can play a file or a stream here:
 *   const dispatcher = connection.play('/home/hydrabolt/audio.mp3');
 * });
 * ```
 * @extends {WritableStream}
 */
class VideoDispatcher extends Writable {
  constructor(player) {
    super();

    this.player = player;
    this.voiceConnection = player.voiceConnection;
    this.payloadType =
      this.voiceConnection.videoCodec === 'H264' ? 101 : this.voiceConnection.videoCodec === 'VP8' ? 103 : 105;

    this._nonce = 0;
    this._nonceBuffer = Buffer.alloc(24);

    this._cachedIFrame = Buffer.alloc(0);

    this.streamingData = {
      sequence: 1583,
      pictureId: 789,
      timestamp: 0,
    };

    this.on('finish', () => {
      this._cleanup();
    });

    const streamError = (type, err) => {
      /**
       * Emitted when the dispatcher encounters an error.
       * @event StreamDispatcher#error
       */
      if (type && err) {
        err.message = `${type} stream: ${err.message}`;
        this.emit(this.player.dispatcher === this ? 'error' : 'debug', err);
      }
      this.destroy();
    };

    this.on('error', () => streamError());
  }

  static _parseRTPPacket(packet) {
    const firstByte = packet[0];

    const ssrc = packet.readUInt32BE(8);

    const meta = {
      version: firstByte >> 6,
      padding: !!((firstByte >> 5) & 1),
      extension: !!((firstByte >> 4) & 1),
      csrcCount: firstByte & 0b1111,
      payloadType: packet[1] & 0b1111111,
      marker: packet[1] >> 7,
      sequenceNum: packet.readUInt16BE(2),
      timestamp: packet.readUInt32BE(4),
      ssrc,
      data: packet.slice(12),
    };
    return meta;
  }

  _write(chunk, enc, done) {
    if (!this.startTime) {
      /**
       * Emitted once the stream has started to play.
       * @event StreamDispatcher#start
       */
      this.emit('start');
      this.startTime = Date.now();
    }
    if (!this.voiceConnection.authentication.secret_key) return;
    if (chunk.length <= 12) return;

    const meta = VideoDispatcher._parseRTPPacket(chunk);

    this._sendPacket(this._createPacket(meta.sequenceNum, meta.timestamp, meta.data, meta.marker));
    done();
  }

  _writeNal(nal, now, last = false) {
    if (!this.hrStartTime) {
      /**
       * Emitted once the stream has started to play.
       * @event StreamDispatcher#start
       */
      this.hrStartTime = process.hrtime.bigint();
    }

    const timeDelta = now - this.hrStartTime;
    const timestamp = Number(BigInt.asUintN(32, timeDelta / RTP_PERIOD));
    const prio = (nal[0] & 0b01100000) >> 5;
    const nalType = nal[0] & 0b00011111;
    console.log(`[packet prio: ${prio} NAL: ${nalType}] ${util.inspect(nal)}`);

    if (nalType === 5) this._cachedIFrame = nal;
    if (nal.length < MTU) {
      this._sendPacket(this._createPacket(this.streamingData.sequence, timestamp, nal, last));
    } else {
      const firstHeader = Buffer.alloc(2);
      firstHeader[0] = (nal[0] & 0b11100000) | 0b00011100;
      firstHeader[1] = (nal[0] & 0b00011111) | 0b10000000;

      this._sendPacket(
        this._createPacket(
          this.streamingData.sequence,
          timestamp,
          Buffer.concat([firstHeader, nal.slice(1, MTU)]),
          false,
        ),
      );

      let offset = MTU;

      while (offset < nal.length) {
        const end = offset + MTU >= nal.length;
        const fuAHeader = Buffer.alloc(2);
        fuAHeader[0] = (nal[0] & 0b11100000) | 0b00011100;
        fuAHeader[1] = (nal[0] & 0b00011111) | (end ? 0b01000000 : 0b00000000);

        this._sendPacket(
          this._createPacket(
            this.streamingData.sequence,
            timestamp,
            Buffer.concat([fuAHeader, nal.slice(offset, offset + MTU)]),
            last && end,
          ),
        );
        offset += MTU;
      }
    }
    if (this.streamingData.sequence >= 2 ** 16) this.streamingData.sequence %= 2 ** 16;
  }

  _destroy(err, cb) {
    super._destroy(err, cb);
  }

  /**
   * The time (in milliseconds) that the dispatcher has been playing audio for, taking into account skips and pauses
   * @type {number}
   * @readonly
   */
  get totalStreamTime() {
    return Date.now() - this.startTime;
  }

  _final(callback) {
    this._writeCallback = null;
    callback();
  }

  _encrypt(buffer) {
    const { secret_key, mode } = this.voiceConnection.authentication;
    if (mode === 'xsalsa20_poly1305_lite') {
      this._nonce++;
      if (this._nonce > MAX_NONCE_SIZE) this._nonce = 0;
      this._nonceBuffer.writeUInt32BE(this._nonce, 0);
      return [secretbox.methods.close(buffer, this._nonceBuffer, secret_key), this._nonceBuffer.slice(0, 4)];
    } else if (mode === 'xsalsa20_poly1305_suffix') {
      const random = secretbox.methods.random(24);
      return [secretbox.methods.close(buffer, random, secret_key), random];
    } else {
      return [secretbox.methods.close(buffer, nonce, secret_key)];
    }
  }

  _createPacket(sequence, timestamp, buffer, marker) {
    const packetBuffer = Buffer.alloc(12);
    packetBuffer[0] = 0x90;
    packetBuffer[1] = this.payloadType | (marker ? 0x80 : 0);

    packetBuffer.writeUIntBE(sequence, 2, 2);
    packetBuffer.writeUIntBE(timestamp, 4, 4);
    packetBuffer.writeUIntBE(this.voiceConnection.videoSSRC, 8, 4);

    packetBuffer.copy(nonce, 0, 0, 12);
    let numBuffer;
    numBuffer = Buffer.from([0xbe, 0xde, 0, 4, 0x32, 0, 0, 0, 0x22, 0, 0, 0, 0x51, 0, 0, 0x40, 0, 0, 0, 0]);
    numBuffer.writeUIntBE((((Date.now() << 18) + 500) / 1000) & 0xffffff, 5, 3);
    numBuffer.writeUIntBE(0xfff, 9, 3);
    numBuffer.writeUInt16BE(this.streamingData.sequence, 13);
    this.streamingData.sequence++;
    if (this.streamingData.sequence >= 2 ** 16) this.streamingData.sequence = 0;
    if (this.voiceConnection.videoCodec === 'VP8') {
      let payloadDescriptorLen = 1;
      const descriptorFirstByte = buffer[0];
      const extendedControlPresent = (descriptorFirstByte >> 7) & 1;

      if (extendedControlPresent) {
        payloadDescriptorLen++;
        const descriptorExtendedControl = buffer[1];
        const pictureIdPresent = (descriptorExtendedControl >> 7) & 1;
        const tempLevelPresent = (descriptorExtendedControl >> 6) & 1;
        const tidYKeyIdxPresent = (descriptorExtendedControl >> 5) & 1 || (descriptorExtendedControl >> 4) & 1;

        let extendedPictureId = false;
        if (pictureIdPresent) extendedPictureId = (buffer[2] >> 7) & 1;

        payloadDescriptorLen += pictureIdPresent + extendedPictureId + tempLevelPresent + tidYKeyIdxPresent;
      }

      const newPayloadDescriptor = Buffer.from([descriptorFirstByte | 0x80, 0x80, 0, 0]);
      newPayloadDescriptor.writeUInt16BE(this.streamingData.pictureId | 0x8000, 2);

      buffer = Buffer.concat([newPayloadDescriptor, buffer.slice(payloadDescriptorLen)]);

      if (marker) this.streamingData.pictureId++;
      if (this.streamingData.pictureId >= 2 ** 15) this.streamingData.pictureId = 0;
    }
    buffer = Buffer.concat([numBuffer, buffer]);
    return Buffer.concat([packetBuffer, ...this._encrypt(buffer)]);
  }

  _sendPacket(packet) {
    /**
     * Emitted whenever the dispatcher has debug information.
     * @event StreamDispatcher#debug
     * @param {string} info The debug info
     */
    if (!this.voiceConnection.sockets.udp) {
      this.emit('debug', 'Failed to send a packet - no UDP socket');
      return;
    }
    this.voiceConnection.sockets.udp.send(packet).catch(e => {
      this._setSpeaking(0);
      this.emit('debug', `Failed to send a packet - ${e}`);
    });
  }

  handleReceiverReport(report) {
    const reportData = {
      ssrc: report.readUInt32BE(),
      fractionLost: report.readUInt8(4),
      packetsLost: report.readUIntBE(5, 3),
      highestSeqNum: report.readUInt32BE(8),
      jitter: report.readUInt32BE(12),
      lsr: report.readUInt32BE(16),
      dlsr: report.readUInt32BE(20),
    };

    console.log(`[rtcp rr] ${util.inspect(reportData)}`);
  }

  handleRTCP(packetData) {
    const mediaSsrc = packetData.data.readUInt32BE();
    if (mediaSsrc !== this.voiceConnection.videoSSRC) return;

    switch (packetData.payloadType) {
      case 201: {
        for (let i = 0; i < packetData.reportCount; i++) {
          this.handleReceiverReport(packetData.data.slice(i * 24, (i + 1) * 24));
        }
        break;
      }
      /*
      case 205: {
        const data = packetData.data.slice(4);
        switch (packetData.reportCount) {
          case 1: {
            const lostPids = [];

            for (let i = 0; i < data.length / 8; i++) {
              const packetId = data.readUInt32BE(i);
              lostPids.push(packetId);

              let lossBitmap = data.readUInt32BE(i + 4);

              for (let j = 1; lossBitmap > 0; lossBitmap >>= 1, j++) {
                // eslint-disable-next-line max-depth
                if ((lossBitmap & 1) === 1) lostPids.push((packetId + j) % 2 ** 16);
              }
            }
            break;
          }
        }
        break;
      }
      */
      case 206: {
        const data = packetData.data.slice(4);
        switch (packetData.reportCount) {
          case 1: {
            console.log(`[PLI]`);
            // this._writeNal(this._cachedIFrame, process.hrtime.bigint(), true);
            break;
          }
          case 15: {
            break;
          }
        }
        break;
      }
    }
  }
}

module.exports = VideoDispatcher;
