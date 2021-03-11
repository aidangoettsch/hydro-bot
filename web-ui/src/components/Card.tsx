import styled from "styled-components";

const Card = styled.div`
    border-radius: 4px;
    background: #fff;
    box-shadow: 0 6px 10px rgba(0,0,0,.08), 0 0 6px rgba(0,0,0,.05);
    padding: 16px;
`

export const GlassCard = styled(Card)`
    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(2px);
    width: 100%;
`

export default Card
