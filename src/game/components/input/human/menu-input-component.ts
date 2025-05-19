import { InputComponent } from '../input-component';
import Phaser from 'phaser';

export class MenuInputComponent extends InputComponent {
    private scene: Phaser.Scene;
    private keys: {
        up: Phaser.Input.Keyboard.Key,
        down: Phaser.Input.Keyboard.Key,
        left: Phaser.Input.Keyboard.Key,
        right: Phaser.Input.Keyboard.Key,
        primary: Phaser.Input.Keyboard.Key[],
        secondary: Phaser.Input.Keyboard.Key[],
        third: Phaser.Input.Keyboard.Key[]
    };

    constructor(scene: Phaser.Scene) {
        super();
        this.scene = scene;
        const kb = scene.input.keyboard!;
        
        this.keys = {
            up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
            left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            primary: [
                kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
                kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
                kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
            ],
            secondary: [
                kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
                kb.addKey(Phaser.Input.Keyboard.KeyCodes.X)
            ],
            third: [kb.addKey(Phaser.Input.Keyboard.KeyCodes.R)]
        };
    }

    update(): void {
        
        // Движение
        this.keys.up.isDown ? this.pressUp() : this.releaseUp();
        this.keys.down.isDown ? this.pressDown() : this.releaseDown();
        this.keys.left.isDown ? this.pressLeft() : this.releaseLeft();
        this.keys.right.isDown ? this.pressRight() : this.releaseRight();
        
        // Действия
        this.keys.primary.some(key => Phaser.Input.Keyboard.JustDown(key)) 
            ? this.pressPrimaryAction() 
            : this.releasePrimaryAction();
            
        this.keys.secondary.some(key => Phaser.Input.Keyboard.JustDown(key))
            ? this.pressSecondaryAction()
            : this.releaseSecondaryAction();
            
        this.keys.third.some(key => Phaser.Input.Keyboard.JustDown(key))
            ? this.pressThirdAction()
            : this.releaseThirdAction();

    }

    cleanup(): void {
        const kb = this.scene.input.keyboard;
        if (!kb) return;
        
        // Удаляем все кастомные клавиши
        this.keys.primary.forEach(key => kb.removeKey(key.keyCode));
        this.keys.secondary.forEach(key => kb.removeKey(key.keyCode));
        this.keys.third.forEach(key => kb.removeKey(key.keyCode));
    }
}