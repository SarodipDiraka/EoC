import Phaser from 'phaser';
import { InputComponent } from '../input/input-component';

export class VerticalMovementComponent {
    private gameObject: Phaser.Physics.Arcade.Sprite;
    private inputComponent: InputComponent;
    private velocity: number;

    constructor(
        gameObject: Phaser.Physics.Arcade.Sprite,
        inputComponent: InputComponent,
        velocity: number
    ) {
        if (!gameObject.body) {
            throw new Error('GameObject must have Arcade Physics body enabled');
        }

        this.gameObject = gameObject;
        this.inputComponent = inputComponent;
        this.velocity = velocity;
    }

    reset(): void {
        if (!this.gameObject.body) return;
        const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
        body.setVelocityY(0);
    }

    update(): void {
        if (!this.gameObject.body) return;
        const body = this.gameObject.body as Phaser.Physics.Arcade.Body;

        const speedModifier = this.inputComponent.focusIsDown ? 0.5 : 1;

        // Проверяем, есть ли одновременное горизонтальное движение
        const isDiagonalMove = (this.inputComponent.leftIsDown || this.inputComponent.rightIsDown) && 
                              (this.inputComponent.upIsDown || this.inputComponent.downIsDown);
        
        // Коэффициент для диагонального движения (1/√2 ≈ 0.707)
        const diagonalFactor = isDiagonalMove ? 0.707 : 1;
        const effectiveVelocity = this.velocity * diagonalFactor * speedModifier;

        if (this.inputComponent.downIsDown) {
            body.setVelocityY(effectiveVelocity);
        } else if (this.inputComponent.upIsDown) {
            body.setVelocityY(-effectiveVelocity);
        } else {
            body.setVelocityY(0);
        }
    }
    
}
