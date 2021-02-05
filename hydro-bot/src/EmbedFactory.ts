import {Bot} from "./bot";
import {MessageEmbed, MessageEmbedFooter, MessageEmbedOptions} from "discord.js";
import {DownloaderResult, MediaResult} from "./downloader/Downloader";
import {QueuedMedia} from "./guild/GuildState";

export default class EmbedFactory {
    readonly footer: MessageEmbedFooter;
    constructor (private bot: Bot) {
        this.footer = {
            iconURL: bot.profilePicUrl || undefined,
            text: `| ${bot.version} - Developed By CF12`
        }
    }

    info(content: string): MessageEmbed {
        return new MessageEmbed({
            title: ':bulb: __❱❱ INFO ❱❱__',
            description: content,
            color: 5235199, // Light Blue
            footer: this.footer
        })
    }


    error(content: string): MessageEmbed {
        return new MessageEmbed({
            title: ':warning: __❱❱ ERROR ❱❱__',
            description: content,
            color: 16731983, // Light Red
            footer: this.footer
        })
    }

    volInfo (volume: number): MessageEmbed {
        return new MessageEmbed({
            title: ':loud_sound: __❱❱ VOLUME ❱❱__',
            description: `Volume has been set to: **${(volume).toFixed(0)}%**`,
            color: 5753896, // Light Green
            footer: this.footer
        })
    }

    static formatDuration = function (duration: number | "live" | "unknown"): string {
        if (duration === "live") return "Live"
        else if (duration === "unknown") return "Unknown"

        const hours   = Math.floor(duration / 3600);
        const minutes = Math.floor((duration - (hours * 3600)) / 60);
        const seconds = duration - (hours * 3600) - (minutes * 60);

        return (hours < 10 ? "0" + hours : hours.toString()) +
            (minutes < 10 ? "0" + minutes : minutes.toString()) +
            (seconds < 10 ? "0" + seconds : seconds.toString())
    }

    mediaInfo (media: QueuedMedia): MessageEmbed {
        return new MessageEmbed({
            title: media.title,
            description: media.description.length > 180 ? media.description.slice(0, 180) + "..." : media.description,
            color: 14038325, // Light Red
            author: {
                name: 'Now Playing',
                iconURL: this.bot.profilePicUrl || undefined
            },
            thumbnail: {
                url: media.thumbnailURL
            },
            fields: [
                {
                    name: 'Uploaded By:',
                    value: media.author,
                    inline: true
                },
                {
                    name: 'Duration',
                    value: EmbedFactory.formatDuration(media.duration),
                    inline: true
                },
                {
                    name: 'Requested By:',
                    value: media.requester
                },
                {
                    name: 'Link',
                    value: media.videoURL
                }
            ],
            footer: this.footer
        })
    }
}
