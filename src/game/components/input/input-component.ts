export class InputComponent {
    private _up: boolean;
    private _down: boolean;
    private _left: boolean;
    private _right: boolean;
    private _focus: boolean;

    private _primaryAction: boolean = false;
    private _secondaryAction: boolean = false;
    private _thirdAction: boolean = false;

    constructor() {
        this.reset();
    }

    // Геттеры
    get upIsDown(): boolean { return this._up; }
    get downIsDown(): boolean { return this._down; }
    get leftIsDown(): boolean { return this._left; }
    get rightIsDown(): boolean { return this._right; }
    get focusIsDown(): boolean { return this._focus; }
    get primaryActionIsDown(): boolean { return this._primaryAction; }
    get secondaryActionIsDown(): boolean { return this._secondaryAction; }
    get thirdActionIsDown(): boolean { return this._thirdAction; }

    // Методы управления состоянием
    pressUp(): void { this._up = true; }
    pressDown(): void { this._down = true; }
    pressLeft(): void { this._left = true; }
    pressRight(): void { this._right = true; }
    pressFocus(): void { this._focus = true; }
    pressPrimaryAction(): void { this._primaryAction = true; }
    pressSecondaryAction(): void { this._secondaryAction = true; }
    pressThirdAction(): void { this._thirdAction = true; }

    releaseUp(): void { this._up = false; }
    releaseDown(): void { this._down = false; }
    releaseLeft(): void { this._left = false; }
    releaseRight(): void { this._right = false; }
    releaseFocus(): void { this._focus = false; }
    releasePrimaryAction(): void { this._primaryAction = false; }
    releaseSecondaryAction(): void { this._secondaryAction = false; }
    releaseThirdAction(): void { this._thirdAction = false; }

    reset(): void {
        this._up = false;
        this._down = false;
        this._left = false;
        this._right = false;
        this._focus = false;
        this._primaryAction = false;
        this._secondaryAction = false;
        this._thirdAction = false;
    }
}
