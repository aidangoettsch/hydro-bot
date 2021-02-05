import Discord from "discord.js";
import GuildState from "../guild/GuildState";
import Command from "./Command";

export default class Leave extends Command {
  info = {
    command: 'leave',
    alias: [],
    fullCommand: 'leave',
    shortDescription: '',
    longDescription: ''
  }

  async execute(msg: Discord.Message, args: string[], guild: GuildState): Promise<void> {
    guild.leaveVoice()
    msg.channel.send(this.bot.embedFactory.info("Left the channel!"))
  }
}
