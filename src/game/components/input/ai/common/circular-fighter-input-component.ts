import { InputComponent } from "../../input-component";

export class CircularFighterInputComponent extends InputComponent {
    private _movementAngle: number = Math.PI/2;
    private _shouldShoot: boolean = false;
    private _shootAngle: number = 0;

    constructor() {
        super();
        this.updateMovement();
    }

    setMovementAngle(angle: number): void {
        this._movementAngle = angle;
        this.updateMovement();
    }

    setShootTarget(angle: number, shouldShoot: boolean): void {
        this._shootAngle = angle;
        this._shouldShoot = shouldShoot;
    }

    update(time: number, delta: number): void {
        if (this._shouldShoot) {
            this.pressPrimaryAction();
        } else {
            this.releasePrimaryAction();
        }
    }

    private updateMovement(): void {
        this.resetMovement();
        const cos = Math.cos(this._movementAngle);
        const sin = Math.sin(this._movementAngle);

        if (cos > 0) this.pressRight();
        else if (cos < 0) this.pressLeft();

        if (sin > 0) this.pressDown();
        else if (sin < 0) this.pressUp();
    }

    public resetMovement(): void {
        this.releaseUp();
        this.releaseDown();
        this.releaseLeft();
        this.releaseRight();
    }
}