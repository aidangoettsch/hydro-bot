exports.handler = async (bot, msg, args, guild) => {
  const cl = bot.modules.consoleLogger
  const ms = bot.modules.messageSender
  const pf = bot.env.prefix

  if (guild.voiceState.nowPlaying) {
    ms.youtubeTrackInfo(guild.voiceState.nowPlaying, msg.channel)
  } else {
    ms.error(`No track playing. Use **${pf}play [url]** to add a track.`, msg.channel)
  }
}

exports.info = {
  command: 'nowplaying',
  alias: ['np', 'nowp', 'nplaying'],
  fullCommand: 'nowplaying',
  shortDescription: '',
  longDescription: ''
}
