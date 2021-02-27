import Discord, {TextChannel} from "discord.js";
import GuildState from "../guild/GuildState";
import Command from "./Command";

export default class Play extends Command {
  info = {
    command: 'play',
    alias: [],
    fullCommand: 'play [URL / Search Query]',
    shortDescription: '',
    longDescription: ''
  }

  async execute(msg: Discord.Message, args: string[], guild: GuildState): Promise<void> {
    if (args.length === 0) {
      throw new Error(`Invalid usage: **${this.bot.config.prefix}play [URL / Search Query]**`)
    } if (!msg.member || !(msg.channel instanceof TextChannel)) {
      throw new Error(`Command can only be used in a guild`)
    } else if (!msg.member.voice.channel) {
      throw new Error(`${msg.member.toString()}, you must be in a voice channel`)
    } else if (!msg.member.voice.channel.joinable) {
      throw new Error(`I don't have permission to join your voice channel!`)
    }

    const query = args.join(' ')
    const media = await this.bot.downloader.getVideo(query)
    if (!media) throw new Error("Cannot handle video from this site")

    if (!guild.inVoice) {
      await guild.joinVoiceChannel(msg.member.voice.channel, msg.channel)
    }

    switch (media.type) {
      case "media":
        const sendQueueMessage = guild.nowPlaying
        await guild.addMedia({
          ...media,
          requester: msg.author
        })
        if (sendQueueMessage) {
          msg.channel.send(this.bot.embedFactory.info(`Added [${media.title}](${media.videoURL}) to the queue!\nPosition: #${guild.queue.length}`))
        }
        break
      case "playlist":
        await media.contents.forEach(m => guild.addMedia({
          ...m,
          requester: msg.author
        }))
        break
      case "search":
        break
    }
  }
}
