import Discord from "discord.js";
import GuildState from "../guild/GuildState";
import Command from "./Command";

export default class Skip extends Command {
  info = {
    command: 'skip',
    alias: [],
    fullCommand: 'skip',
    shortDescription: '',
    longDescription: ''
  }

  async execute(msg: Discord.Message, args: string[], guild: GuildState): Promise<void> {
    await guild.skipTrack()
    msg.channel.send(this.bot.embedFactory.info("Skipping track..."))
  }
}
