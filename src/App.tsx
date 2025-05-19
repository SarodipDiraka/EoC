import { useRef } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/phaser-game-wrapper';

export default function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} />
        </div>
    )
}
