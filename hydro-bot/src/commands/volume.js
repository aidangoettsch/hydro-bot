exports.handler = async (bot, msg, args, guild) => {
  const cl = bot.modules.consoleLogger
  const ms = bot.modules.messageSender
  const pf = bot.env.prefix
  const vh = guild.voiceHandler

  if (isNaN(args[0]) || args[0] <= 0 || args[0] > 100)
    return ms.error('Invalid Volume Input! Value must be between 1 and 100', msg.channel)
  else if (!guild.voiceState.voiceConnection)
    return ms.error(`The bot must be in a voice channel!`, msg.channel)
  else if (!msg.member.voice || !msg.member.voice.channel || (msg.member.voice.channel.id !== guild.voiceState.voiceConnection.channel.id))
    return ms.error(`You must be in the bot's voice channel!`, msg.channel)

  try {
    const volume = vh.setVolume(args[0] / 100)
    ms.volInfo(volume, msg.channel)
  } catch (err) {
    if (err) cl.error(err)
  }
}

exports.info = {
  command: 'volume',
  alias: [],
  fullCommand: 'volume [1 - 100]',
  shortDescription: '',
  longDescription: ''
}
