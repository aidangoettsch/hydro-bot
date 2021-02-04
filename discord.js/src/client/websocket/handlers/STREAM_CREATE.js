'use strict';

module.exports = (client, packet) => {
    client.emit('streamCreate', packet.d);
};
