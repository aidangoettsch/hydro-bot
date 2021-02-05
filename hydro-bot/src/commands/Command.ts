import Discord from "discord.js";
import {Bot} from "../bot";
import CommandHandler from "../CommandHandler";
import GuildState from "../guild/GuildState";

export interface CommandInfo {
  command: string
  alias: string[]
  fullCommand: string
  shortDescription: string
  longDescription: string
}

export default abstract class Command {
  public abstract info: CommandInfo

  constructor(protected bot: Bot, protected commandHandler: CommandHandler) {}

  abstract execute(msg: Discord.Message, args: string[], state: GuildState): Promise<void>
}
