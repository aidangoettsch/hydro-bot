class MessageSender {
    constructor (bot) {
        this.profilePicUrl = bot.user.avatarURL({ size: 32 })
        this.pf = bot.env.prefix

        this.footer = {
            icon_url: this.profilePicUrl,
            text: `| ${config.version} - Developed By CF12`
        }
    }

    _msgDeleter (msg, duration) {
        if (duration > 0) msg.delete({ timeout: duration })
    }

    customEmbed (embed, channel, duration = defaultDuration) {
        const payload = Object.assign(embed, { footer: this.footer })

        channel.send({ embed: payload })
            .then(msg => { this._msgDeleter(msg, duration) })
    }

    info (content, channel, duration = defaultDuration) {
        channel.send({
            embed: {
                title: ':bulb: __❱❱ INFO ❱❱__',
                description: content,
                color: 5235199, // Light Blue
                footer: this.footer
            }
        }).then(msg => { this._msgDeleter(msg, duration) })
    }

    error (content, channel, duration = defaultDuration) {
        channel.send({
            embed: {
                title: ':warning: __❱❱ ERROR ❱❱__',
                description: content,
                color: 16731983, // Light Red
                footer: this.footer
            }
        }).then(msg => { this._msgDeleter(msg, duration) })
    }

    volInfo (volume, channel, duration = defaultDuration) {
        channel.send({
            embed: {
                title: ':loud_sound: __❱❱ VOLUME ❱❱__',
                description: `Volume has been set to: **${volume}**`,
                color: 5753896, // Light Green
                footer: this.footer
            }
        }).then(msg => { this._msgDeleter(msg, duration) })
    }

    youtubeTrackInfo (content, channel, duration = defaultDuration) {
        channel.send({
            embed: {
                title: content.title,
                description: content.description,
                color: 14038325, // Light Red
                author: {
                    name: 'Now Playing - YouTube™ Video',
                    icon_url: this.profilePicUrl
                },
                thumbnail: {
                    url: content.thumbnail
                },
                fields: [
                    {
                        name: 'Uploaded By:',
                        value: content.uploader,
                        inline: true
                    },
                    {
                        name: 'Duration',
                        value: content.duration.format('d[d] h[h] m[m] s[s]'),
                        inline: true
                    },
                    {
                        name: 'Requested By:',
                        value: content.requester
                    },
                    {
                        name: 'Link',
                        value: `https://youtu.be/${content.id}`
                    }
                ],
                footer: this.footer
            }
        }).then(msg => { this._msgDeleter(msg, duration) })
    }
}