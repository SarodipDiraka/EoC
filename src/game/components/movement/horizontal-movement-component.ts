import Phaser from 'phaser';
import { InputComponent } from '../input/input-component';

export class HorizontalMovementComponent {
    private gameObject: Phaser.Physics.Arcade.Sprite;
    private inputComponent: InputComponent;
    private velocity: number;

    constructor(
        gameObject: Phaser.Physics.Arcade.Sprite,
        inputComponent: InputComponent,
        velocity: number
    ) {
        this.gameObject = gameObject;
        this.inputComponent = inputComponent;
        this.velocity = velocity;

        // Проверка наличия физического тела
        if (!this.gameObject.body) {
            throw new Error('GameObject must have Arcade Physics body enabled');
        }
    }

    reset(): void {
        if (!this.gameObject.body) return;
        const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);
    }

    update(): void {
        if (!this.gameObject.body) return;
        const body = this.gameObject.body as Phaser.Physics.Arcade.Body;

        const speedModifier = this.inputComponent.focusIsDown ? 0.5 : 1;

        // Проверяем, есть ли одновременное вертикальное движение
        const isDiagonalMove = (this.inputComponent.upIsDown || this.inputComponent.downIsDown) && 
                              (this.inputComponent.leftIsDown || this.inputComponent.rightIsDown);
        
        // Коэффициент для диагонального движения (1/√2 ≈ 0.707)
        const diagonalFactor = isDiagonalMove ? 0.707 : 1;
        const effectiveVelocity = this.velocity * diagonalFactor * speedModifier;
        

        if (this.inputComponent.leftIsDown) {
            body.setVelocityX(-effectiveVelocity);
        } else if (this.inputComponent.rightIsDown) {
            body.setVelocityX(effectiveVelocity);
        } else {
            body.setVelocityX(0);
        }
    }
    
}
