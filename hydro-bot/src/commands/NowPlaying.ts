import Discord from "discord.js";
import GuildState from "../guild/GuildState";
import Command from "./Command";

export default class NowPlaying extends Command {
  info = {
    command: 'nowplaying',
    alias: ['np'],
    fullCommand: 'nowplaying',
    shortDescription: '',
    longDescription: ''
  }

  async execute(msg: Discord.Message, args: string[], guild: GuildState): Promise<void> {
    if (guild.nowPlaying) {
      msg.channel.send(this.bot.embedFactory.mediaInfo(guild.nowPlaying))
    } else {
      throw new Error(`No track playing. Use **${this.bot.config.prefix}play [url]** to add a track.`)
    }
  }
}
