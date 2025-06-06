import Phaser from 'phaser';
import { EventBus } from '../event-bus';
import { MenuInputComponent } from '../components/input/human/menu-input-component';
import { LocalStorageManager } from '../managers/local-storage-manager';

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
            }),
            this.createMenuItem(500, 'SAVE RESULT', '#ffffff', () => {
                if (LocalStorageManager.isScoreInTop(this.score)) {
                    this.scene.launch('InputScene', { 
                        score: this.score, 
                        level: this.registry.get('currentLevel') || 1
                    });
                } else {
                    this.showMessage('Score too low for top 10');
                }
            }),
            this.createMenuItem(600, 'MAIN MENU', '#ffffff', () => {
                this.sound.stopAll();
                this.scene.stop();
                EventBus.emit('main-menu-from-game-over');
            })
        ];
    }

    private showMessage(text: string) {
        // Удаляем предыдущее сообщение, если оно есть
        const existingMessage = this.children.getByName('statusMessage');
        if (existingMessage) {
            existingMessage.destroy();
        }

        // Создаем новое сообщение с именем для последующего удаления
        const message = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            text,
            {
                fontFamily: 'Arial',
                fontSize: '28px',
                color: '#ff0000',
                backgroundColor: '#333333',
                padding: { left: 20, right: 20, top: 10, bottom: 10 },
                stroke: '#000000',
                strokeThickness: 2
            }
        )
        .setOrigin(0.5)
        .setDepth(100) // Устанавливаем высокий depth чтобы было поверх других элементов
        .setName('statusMessage'); // Даем имя для последующего поиска

        // Анимация появления
        message.setAlpha(0);
        this.tweens.add({
            targets: message,
            alpha: 1,
            duration: 300,
            ease: 'Linear'
        });

        // Автоматическое исчезновение через 2 секунды с анимацией
        this.time.delayedCall(2000, () => {
            this.tweens.add({
                targets: message,
                alpha: 0,
                duration: 500,
                ease: 'Linear',
                onComplete: () => message.destroy()
            });
        });
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
        if (!this.menuInput || this.isInputSceneActive()) return;

        this.menuInput.update();

        this.handleNavigation(time);
        this.handleSelection();
        this.handleThirdAction();
    }

    private isInputSceneActive(): boolean {
        return this.scene.isActive('InputScene');
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

    private handleThirdAction() {
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
        const message = this.children.getByName('statusMessage');
        if (message) {
            message.destroy();
        }

        this.menuInput?.cleanup();
        this.input.off('pointermove');
    }
}
