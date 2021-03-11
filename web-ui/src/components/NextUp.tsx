import {Track, TrackComponent} from "./Track";
import Card from "./Card";
import React from "react";
import styled from "styled-components";

const NextUpHeader = styled.h2`
  margin: 0 0 8px;
`

const NextUpContainer = styled.div`
    display: flex;
    flex-direction: column-reverse;
    height: 100%;
`

const NextUpCard = styled(Card)`
    width: min-content;
    inline-size: min-content;
    height: min-content;
    block-size: min-content;
    
    margin: 24px;
    align-self: flex-end; 
    justify-self: flex-end;
`

const NextUp: React.FC<{ track: Track }> = props => (<NextUpContainer>
    <NextUpCard>
        <NextUpHeader>Next Up</NextUpHeader>
        <TrackComponent {...props.track}/>
    </NextUpCard>
</NextUpContainer>)

export default NextUp
