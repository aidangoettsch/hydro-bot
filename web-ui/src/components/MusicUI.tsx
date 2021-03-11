import styled from "styled-components";
import {PlayingTrack, Track, TrackComponent} from "./Track";
import {GlassCard} from "./Card";

const MusicUIContainer = styled.div`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 10vw;
    
    background: url(https://images.unsplash.com/photo-1615250117865-0f9d70cd848b?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=934&q=80) 50% 50% no-repeat;
    background-size: cover;
`

const QueueHeader = styled.h2`
    margin: 0;
`

const QueueHint = styled.p`
    font-weight: 200;
    font-style: italic;
    font-size: 1.25em;
    width: 100%;
    text-align: center;
`

const QueueContainer = styled(GlassCard)`
    width: 20vw;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    gap: 8px;
`

const Queue: React.FC<{ queue: Track[] }> = props => {
    const body = props.queue.length > 0 ? (<>
        <QueueHeader>Queue</QueueHeader>
        {props.queue.map((t, i) => (<GlassCard><TrackComponent {...t} key={i}/></GlassCard>))}
    </>) : (
        <QueueHint>Nothing is queued! Use $play [url] to add something.</QueueHint>
    )

    return (<QueueContainer>
        {body}
    </QueueContainer>)
}

const NowPlayingContainer = styled(GlassCard)`
    width: 20vw;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 8px;
`

const Thumbnail = styled.div<{src: string}>`
    background: url(${props => props.src}) 50% 50% no-repeat;
    background-size: cover;
    width: 15vw;
    height: 15vw;
    margin-top: 96px;
    margin-bottom: 96px;
    border-radius: 50%;
`

const Title = styled.h1`
  margin: 0;
`

const Author = styled.h2`
  margin: 4px 0 0;
  font-weight: normal;
  font-style: italic;
`

const Timestamp = styled.p`
    margin: 0;
`

const Progress = styled.progress`
    -webkit-appearance: none;
    appearance: none;
    
    margin: 0;
    height: 6px;
    border-radius: 3px;
`

const TimeContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;
`

const NowPlaying: React.FC<PlayingTrack> = props => (<NowPlayingContainer>
    <Thumbnail src={props.thumbnail}/>
    <Title>{props.title}</Title>
    <Author>{props.author}</Author>
    <TimeContainer>
        <Timestamp>{props.elapsedString}</Timestamp>
        <Progress max={props.duration} value={props.elapsed}/>
        <Timestamp>{props.durationString}</Timestamp>
    </TimeContainer>
</NowPlayingContainer>)

const MusicUI: React.FC<{
    nowPlaying: PlayingTrack;
    queue: Track[];
}> = props => (<MusicUIContainer>
    <Queue queue={props.queue}/>
    <NowPlaying {...props.nowPlaying}/>
</MusicUIContainer>)

export default MusicUI
