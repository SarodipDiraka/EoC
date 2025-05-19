import { InputComponent } from '../../input-component';
import * as CONFIG from '../../../../configs/game-config';
import Phaser from 'phaser';

export class BotScoutInputComponent extends InputComponent {
    private gameObject: Phaser.GameObjects.Sprite;
    private startX: number;
    private readonly maxXMovement: number;

    constructor(gameObject: Phaser.GameObjects.Sprite) {
        super();
        this.gameObject = gameObject;
        this.startX = gameObject.x;
        this.maxXMovement = CONFIG.ENEMY_SCOUT_MOVEMENT_MAX_X;
        
        this.pressRight();
        this.pressDown();
        this.releaseLeft();
    }

    setStartX(val: number): void {
        this.startX = val;
    }

    update(): void {
        const currentX = this.gameObject.x;
        
        if (currentX > this.startX + this.maxXMovement) {
            this.pressLeft();
            this.releaseRight();
        } else if (currentX < this.startX - this.maxXMovement) {
            this.releaseLeft();
            this.pressRight();
        }
    }
}
