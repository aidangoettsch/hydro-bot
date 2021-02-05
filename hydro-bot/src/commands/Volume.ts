import Discord from "discord.js";
import GuildState from "../guild/GuildState";
import Command from "./Command";

export default class Volume extends Command {
  info = {
    command: 'volume',
    alias: [],
    fullCommand: 'volume [1 - 100]',
    shortDescription: '',
    longDescription: ''
  }

  async execute(msg: Discord.Message, args: string[], guild: GuildState): Promise<void> {
    const volume = parseInt(args[0])
    if (!volume || volume <= 0 || volume > 100) {
      throw new Error('Invalid Volume Input! Value must be between 1 and 100')
    } else if (!msg.member?.voice || !msg.member.voice.channel || (msg.member.voice.channel.id !== guild.currentChannel?.id)) {
      throw new Error(`You must be in the bot's voice channel!`)
    }

    guild.setVolume(volume / 100)
    msg.channel.send(this.bot.embedFactory.volInfo(volume))
  }
}
