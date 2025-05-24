import { BootScene } from './scenes/boot-scene';
import { GameScene } from './scenes/game-scene';
import { GameOver } from './scenes/game-over-scene';
import { MainMenu } from './scenes/main-menu-scene';
import { PauseMenu } from './scenes/pause-menu-scene';
import { PreloadScene } from './scenes/preload-scene';
import { Game, AUTO } from 'phaser';
import { LevelCompleteScene } from './scenes/level-complete-scene';
import { VictoryScene } from './scenes/victory-scene';
import { OptionsScene } from './scenes/options-scene';
import { RecordsScene } from './scenes/records-scene';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 480,
    height: 640,
    parent: 'game-container',
    roundPixels: true,
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.HEIGHT_CONTROLS_WIDTH,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0, x: 0 },
            debug: false
        }
    },
    scene: [BootScene, PreloadScene, MainMenu, GameScene, PauseMenu, GameOver, LevelCompleteScene, VictoryScene, RecordsScene, OptionsScene ]
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;
