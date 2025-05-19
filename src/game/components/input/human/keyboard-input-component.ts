import { InputComponent } from '../input-component';
import Phaser from 'phaser';

export class KeyboardInputComponent extends InputComponent {
    private cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    private shootKeyZ: Phaser.Input.Keyboard.Key;
    private shootKeyX: Phaser.Input.Keyboard.Key;
    private shootKeyC: Phaser.Input.Keyboard.Key;
    private focusKeyShift: Phaser.Input.Keyboard.Key;
    private inputLocked: boolean;

    constructor(scene: Phaser.Scene) {
        super();
        this.cursorKeys = scene.input.keyboard!.createCursorKeys();
        this.shootKeyZ = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.shootKeyX = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        this.shootKeyC = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.focusKeyShift = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.inputLocked = false;
    }

    set lockInput(val: boolean) {
        this.inputLocked = val;
    }

    update(): void {
        if (this.inputLocked) {
            this.reset();
            return;
        }

        // Используем методы родительского класса вместо прямого доступа к полям
        this.cursorKeys.up.isDown ? this.pressUp() : this.releaseUp();
        this.cursorKeys.down.isDown ? this.pressDown() : this.releaseDown();
        this.cursorKeys.left.isDown ? this.pressLeft() : this.releaseLeft();
        this.cursorKeys.right.isDown ? this.pressRight() : this.releaseRight();
        this.cursorKeys.space.isDown || this.shootKeyZ.isDown 
            ? this.pressPrimaryAction() 
            : this.releasePrimaryAction();
        
        // Вторичное действие (X)
        this.shootKeyX.isDown 
            ? this.pressSecondaryAction() 
            : this.releaseSecondaryAction();
            
        // Третичное действие (C)
        this.shootKeyC.isDown 
            ? this.pressThirdAction() 
            : this.releaseThirdAction();
            
        // Фокусировка/Торможение (Shift)
        this.focusKeyShift.isDown 
            ? this.pressFocus() 
            : this.releaseFocus();
    }
}