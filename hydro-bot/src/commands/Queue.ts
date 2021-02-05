import Discord, {MessageEmbed, MessageEmbedOptions} from "discord.js";
import GuildState from "../guild/GuildState";
import EmbedFactory from "../EmbedFactory";
import Command from "./Command";

export default class Queue extends Command {
  info = {
    command: 'queue',
    alias: [],
    fullCommand: 'queue {page #}',
    shortDescription: '',
    longDescription: ''
  }

  async execute(msg: Discord.Message, args: string[], guild: GuildState): Promise<void> {
    const pageLength = this.bot.config.queuePageLength
    const queue = guild.queue

    // Default embed, when no tracks are queued
    const embed: MessageEmbedOptions = {
      title: ':notepad_spiral: **❱❱ QUEUE ❱❱**',
      description: `The queue is currently empty. Use **${this.bot.config.prefix}play <url>** to queue a track.`,
      color: parseInt('676767', 16), // Gray
      footer: this.bot.embedFactory.footer
    }

    // Command logic & result sending
    if (guild.nowPlaying) {
      const nowPlaying = guild.nowPlaying
      let data = []

      // Custom titling for currently playing track
      data.push({
        name: `NP | ${nowPlaying.title}`,
        value: `[${EmbedFactory.formatDuration(nowPlaying.duration)}] - Uploaded by **${nowPlaying.author}** - Requested by ${nowPlaying.requester}`
      })

      // Numbers & Formats the rest of queue based on embed field format
      let counter = 2
      queue.forEach((media) => {
        data.push({
          name: `#${counter} | ${media.title}`,
          value: `[${EmbedFactory.formatDuration(media.duration)}] - Uploaded by **${media.author}** - Requested by ${media.requester}`
        })
        counter++
      })

      const pageNum = parseInt(args[0]) || 1
      const maxPage = Math.ceil(data.length / pageLength)

      if (isNaN(pageNum) || pageNum > maxPage || pageNum < 1) {
        embed.description = `Invalid page number! Page number should be **between 1 and ${maxPage}.**`
        embed.color = parseInt('ff4f4f', 16) // Light Red
      } else {
        embed.description = `Showing Page **[${pageNum} / ${maxPage}]** | Total Tracks: **${data.length}**\n` +
            `Use **${this.bot.config.prefix}queue {page #}** to specify the page number.`

        embed.color = parseInt('b634eb', 16) // Purple
        embed.fields = data.slice(pageLength * (pageNum - 1), pageLength * pageNum)
      }
    }

    msg.channel.send(new MessageEmbed(embed))
  }
}
