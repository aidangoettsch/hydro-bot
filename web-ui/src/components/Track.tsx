import styled from "styled-components";
import {ReactElement} from "react";
import soundcloudIcon from "./icons/soundcloud.svg";

type Service = "YouTube" | "Twitch" | "TikTok" | "Soundcloud"

const TrackServiceIcon = styled.img`
    margin-right: 8px;
`

const serviceIcons: Record<Service, ReactElement> = {
    "YouTube": <TrackServiceIcon src={soundcloudIcon} alt="Soundcloud"/>,
    "Twitch": <TrackServiceIcon src={soundcloudIcon} alt="Soundcloud"/>,
    "TikTok": <TrackServiceIcon src={soundcloudIcon} alt="Soundcloud"/>,
    "Soundcloud": <TrackServiceIcon src={soundcloudIcon} alt="Soundcloud"/>,
}

export interface Track {
    service: Service;
    title: string;
    author: string;
    thumbnail: string;
}

export type PlayingTrack = Track & {
    duration: number;
    durationString: string;
    elapsed: number;
    elapsedString: string;
}

const TrackContainer = styled.div`
    display: grid;
    grid-template-columns: 128px minmax(auto, max-content);
    grid-template-rows: repeat(3, auto);
    grid-template-areas:
        "thumbnail service"
        "thumbnail title"
        "thumbnail author";
    text-align: left;
    grid-row-gap: 4px;
    grid-column-gap: 16px;
    align-items: center;
`

const TrackServiceContainer = styled.div`
    font-weight: bold;
    grid-area: service;
    display: flex;
    align-items: center;
`

const TrackTitle = styled.p`
    font-weight: bold;
    grid-area: title;
    margin: 0;
    height: min-content;
`

const TrackAuthor = styled.p`
    grid-area: author;
    margin: 0;
    height: min-content;
`

const TrackThumbnail = styled.img`
    grid-area: thumbnail;
    width: 128px
`

const TrackService: React.FC<{ service: Service }> = props => (<TrackServiceContainer>
    {serviceIcons[props.service]}
    <TrackTitle>{props.service}</TrackTitle>
</TrackServiceContainer>)

export const TrackComponent: React.FC<Track> = props => (<>
    <TrackContainer>
        <TrackThumbnail src={props.thumbnail} alt=""/>
        <TrackService service={props.service}/>
        <TrackTitle>{props.title}</TrackTitle>
        <TrackAuthor>{props.author}</TrackAuthor>
    </TrackContainer>
</>)
