import React, {useEffect, useState} from 'react';
import MusicUI from "./components/MusicUI";
import {Service} from "./components/Track";

const testTrack = {
    service: "Soundcloud" as Service,
    title: "Flight-Proven",
    author: "Test Shot Starfish",
    thumbnail: "https://i1.sndcdn.com/artworks-000377017629-ipbol1-t500x500.jpg",
}

const testTrack2 = {
    service: "YouTube" as Service,
    title: "Fire or No Fire: New NZXT H1 Riser X-Ray & Testing (NZXT H1 PCIe Riser Fix)",
    author: "Gamers Nexus",
    thumbnail: "https://i.ytimg.com/vi/c9PlibqsBWg/hqdefault.jpg?sqp=-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLDt9sskMv4ipLecJiv1uPjIOl-d3w",
}

const App: React.FC = props => {
    const [queue, setQueue] = useState([{...testTrack, id: "fhk"}, {...testTrack2, id: "gfdsg"}]);
    const [nowPlaying, setNowPlaying] = useState({
        ...testTrack,
        id: "hgdk",
        duration: 174,
        durationString: "2:54",
        elapsed: 25,
        elapsedString: "0:25"
    });

    useEffect(() => void setTimeout(() => setQueue([...queue, {...testTrack, id: "sgdf"}]), 5000), [])

    return (
        <MusicUI queue={queue} nowPlaying={nowPlaying}/>
    );
}

export default App;
