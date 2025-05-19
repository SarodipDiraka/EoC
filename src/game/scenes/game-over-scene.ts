import Phaser from 'phaser';
import { EventBus } from '../event-bus';
import { MenuInputComponent } from '../components/input/human/menu-input-component';

export class GameOver extends Phaser.Scene {
    private menuInput!: MenuInputComponent;
    private menuItems: Phaser.GameObjects.Text[] = [];
    private selectedItemIndex = 0;
    private lastInputTime = 0;
    private inputDelay = 200;
    private score: number = 0;

    constructor() {
        super('GameOver');
    }

    init(data: { score: number }) {
        this.score = data.score || 0;
        this.selectedItemIndex = 0;
        this.lastInputTime = 0;
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.createBackground();
        this.createTitle();
        this.createScoreDisplay();
        this.createMenuItems();
        this.setupInput();
        this.selectMenuItem(0);

        EventBus.emit('current-scene-ready', this);
    }

    private createBackground() {
        this.add.rectangle(
            0, 0, 
            this.cameras.main.width, 
            this.cameras.main.height, 
            0x000000, 0.7
        ).setOrigin(0);
    }

    private createTitle() {
        this.add.text(
            this.cameras.main.width / 2, 
            100, 
            'GAME OVER',
            {
                fontSize: '48px',
                color: '#ff0000',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
    }

    private createScoreDisplay() {
        this.add.text(
            this.cameras.main.width / 2, 
            200, 
            `FINAL SCORE: ${this.score}`, 
            { 
                fontFamily: 'Arial', 
                fontSize: '32px', 
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);
    }

    private createMenuItems() {
        this.menuItems = [
            this.createMenuItem(300, 'CONTINUE', '#00ff00', () => {
                EventBus.emit('continue-game');
                this.scene.stop();
            }),
            this.createMenuItem(400, 'PLAY AGAIN', '#ffffff', () => {
                this.sound.stopAll();
                this.scene.stop();
                EventBus.emit('restart-game');
                this.scene.start('GameScene');
            }),
            this.createMenuItem(500, 'SAVE RESULT', '#ffffff', () => {
                console.log('Save score:', this.score);
            }),
            this.createMenuItem(600, 'MAIN MENU', '#ffffff', () => {
                this.sound.stopAll();
                this.scene.start('MainMenu');
                this.scene.stop('GameScene');
            })
        ];
    }

    private createMenuItem(y: number, text: string, color: string, action: () => void): Phaser.GameObjects.Text {
        const menuItem = this.add.text(
            this.cameras.main.width / 2, 
            y, 
            text, 
            { 
                fontFamily: 'Arial', 
                fontSize: '32px', 
                color: color,
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setInteractive();

        menuItem.on('pointerover', () => {
            this.selectedItemIndex = this.menuItems.indexOf(menuItem);
            this.selectMenuItem(this.selectedItemIndex);
        });

        menuItem.on('pointerout', () => {
            menuItem.setColor(color);
        });

        menuItem.on('pointerdown', action);

        return menuItem;
    }

    private setupInput() {
        this.menuInput = new MenuInputComponent(this);
        
        // Добавляем поддержку мыши
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;
            
            const item = this.menuItems.find(item => 
                item.getBounds().contains(pointer.x, pointer.y)
            );
            
            if (item) {
                this.selectedItemIndex = this.menuItems.indexOf(item);
                this.selectMenuItem(this.selectedItemIndex);
                item.emit('pointerdown');
            }
        });
    }

    update(time: number) {
        if (!this.menuInput) return;

        this.menuInput.update();

        this.handleNavigation(time);
        this.handleSelection();
        this.handleTrirdAction();
    }

    private handleNavigation(time: number) {
        if (time - this.lastInputTime < this.inputDelay) return;

        if (this.menuInput.downIsDown) {
            this.changeSelectedItem(1);
            this.lastInputTime = time;
        } 
        else if (this.menuInput.upIsDown) {
            this.changeSelectedItem(-1);
            this.lastInputTime = time;
        }
    }

    private changeSelectedItem(direction: number) {
        this.selectedItemIndex = (this.selectedItemIndex + direction + this.menuItems.length) % this.menuItems.length;
        this.selectMenuItem(this.selectedItemIndex);
    }

    private handleSelection() {
        if (this.menuInput.primaryActionIsDown) {
            this.menuItems[this.selectedItemIndex].emit('pointerdown');
        }
    }

    private handleTrirdAction() {
        if (this.menuInput.thirdActionIsDown) {
            this.registry.get('onRestart')();
        }
    }

    private selectMenuItem(index: number) {
        this.menuItems.forEach((item, i) => {
            item.setColor(i === index ? '#ff0' : '#fff');
            item.setScale(i === index ? 1.1 : 1.0);
        });
    }

    shutdown() {
        this.menuInput.cleanup();
        this.input.off('pointermove');
    }
}
