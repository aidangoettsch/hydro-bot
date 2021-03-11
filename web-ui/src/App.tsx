import React from 'react';
import MusicUI from "./components/MusicUI";
import {Track} from "./components/Track";

const testTrack: Track = {
    service: "Soundcloud",
    title: "Flight-Proven",
    author: "Test Shot Starfish",
    thumbnail: "https://i1.sndcdn.com/artworks-000377017629-ipbol1-t500x500.jpg",
}

const testTrack2: Track = {
    service: "YouTube",
    title: "Fire or No Fire: New NZXT H1 Riser X-Ray & Testing (NZXT H1 PCIe Riser Fix)",
    author: "Gamers Nexus",
    thumbnail: "https://i.ytimg.com/vi/c9PlibqsBWg/hqdefault.jpg?sqp=-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLDt9sskMv4ipLecJiv1uPjIOl-d3w",
}

function App() {
  return (
    <MusicUI queue={[testTrack, testTrack2, testTrack]} nowPlaying={{
        ...testTrack,
        duration: 174,
        durationString: "2:54",
        elapsed: 25,
        elapsedString: "0:25"
    }}/>
  );
}

export default App;
