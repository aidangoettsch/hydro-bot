'use strict';

module.exports = (client, packet) => {
    client.emit('streamServer', packet.d);
};
