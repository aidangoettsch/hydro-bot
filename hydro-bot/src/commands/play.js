const ytdl = require('ytdl-core')
const ytpl = require('ytpl')
const ytsr = require('ytsr')

exports.handler = async (bot, msg, args, guild) => {
  const ms = bot.modules.messageSender
  const cl = bot.modules.consoleLogger
  const pf = bot.env.prefix
  const vh = guild.voiceHandler

  if (args.length === 0)
    return ms.error(`Invalid usage: **${pf}play [YouTube URL / Search Query]**`, msg.channel)
  else if (!msg.member.voice.channel)
    return ms.error(`${msg.member.toString()}, you must be in a voice channel`, msg.channel)
  else if (!msg.member.voice.channel.joinable)
    return ms.error(`I don't have permission to join your voice channel!`, msg.channel)


  const query = args.join(' ')
  let track

  if (ytdl.validateURL(query)) {
    track = {
      type: 'video',
      id: await ytdl.getVideoID(query)
    }
  } else if (ytpl.validateURL(query)) {
    track = {
      type: 'playlist',
      id: await ytpl.getPlaylistID(query)
    }
  } else {
    const search = await ytsr(query, { limit: 1 })
    if (!search.items || !search.items[0] || !search.items[0].link) {
      ms.error(`Couldn't find a video from the search query "${query}"`, msg.channel)
      return
    }

    track = {
      type: 'video',
      id: search.items[0].link
    }
  }

  if (!guild.voiceState.voiceConnection) {
    guild.setVoiceMsgChannel(msg.channel)
    ms.info(`Joining ${msg.member.toString()}'s voice channel...`, msg.channel)
    await vh.joinVoice(msg.member.voice.channel)
  }

  if (track.type === 'video') {
    ms.info(`Video has been queued`, msg.channel)
    await vh.addTrack(track.id, msg.member)
  } else if (track.type === 'playlist') {
    ms.info('Playlist has been queued', msg.channel)
    await vh.addPlaylist(track.id, msg.member)
  }
}

exports.info = {
  command: 'play',
  alias: [],
  fullCommand: 'play [YouTube URL / Search Query]',
  shortDescription: '',
  longDescription: ''
}
