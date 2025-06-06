import Phaser from 'phaser';
import { EventBus } from '../event-bus';
import { MenuInputComponent } from '../components/input/human/menu-input-component';
import * as CONFIG from '../configs/game-config';
import { CUSTOM_EVENTS } from '../types/custom-events';
import { LocalStorageManager } from '../managers/local-storage-manager';

export class VictoryScene extends Phaser.Scene {
    private menuInput!: MenuInputComponent;
    private menuItems: Phaser.GameObjects.Text[] = [];
    private selectedItemIndex = 0;
    private lastInputTime = 0;
    private inputDelay = 200;
    private finalScore = 0;
    private bonusScore = 0;
    private currentDisplayGroup!: Phaser.GameObjects.Group;
    private overlay!: Phaser.GameObjects.Rectangle;

    constructor() {
        super({ key: 'Victory' });
    }

    init(data: { score: number, lives?: number }) {
        this.finalScore = data.score;
        this.bonusScore = (data.lives || 0) * CONFIG.LIFE_BONUS_VALUE;
    }

    create() {
        // Затемнение игрового фона (50% прозрачности)
        this.overlay = this.add.rectangle(
            0, 0, 
            this.scale.width, 
            this.scale.height, 
            0x000000, 
            0.5  // Изменили прозрачность на 0.5 (50%)
        ).setOrigin(0).setDepth(0);

        // Создаем группу для текущих элементов интерфейса
        this.currentDisplayGroup = this.add.group();
        
        this.showBonusScreen();
        EventBus.emit('current-scene-ready', this);
    }

    private showBonusScreen() {
        this.clearCurrentDisplay();

        // Заголовок
        const title = this.add.text(
            this.scale.width/2, 150, 
            'GAME COMPLETE', 
            { 
                fontFamily: 'Arial',
                fontSize: '48px', 
                color: '#ffcc00',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(1);

        // Бонус за жизни
        const bonusText = this.add.text(
            this.scale.width/2, 300, 
            '', 
            { 
                fontFamily: 'Arial',
                fontSize: '32px', 
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(1);

        // Финальный счет
        const finalText = this.add.text(
            this.scale.width/2, 400, 
            '', 
            { 
                fontFamily: 'Arial',
                fontSize: '36px', 
                color: '#ffcc00',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setAlpha(0).setDepth(1);

        // Добавляем в группу
        this.currentDisplayGroup.addMultiple([title, bonusText, finalText]);

        // Анимация подсчета бонусов
        this.tweens.addCounter({
            from: 0,
            to: this.bonusScore,
            duration: 2000,
            onUpdate: tween => {
                const value = Math.floor(tween.getValue());
                bonusText.setText(`LIFE BONUS: ${value}`);
            },
            onComplete: () => {
                this.finalScore += this.bonusScore;
                finalText.setText(`FINAL SCORE: ${this.finalScore}`).setAlpha(1);

                // Переход к титрам через 3 секунды
                this.time.delayedCall(3000, () => {
                    this.showCredits();
                });
            }
        });
    }

    private showCredits() {
        this.clearCurrentDisplay();
        EventBus.emit(CUSTOM_EVENTS.CLEANUP_GAME);
        this.scene.stop('GameScene');

        // Титры
        const credits = [
            'GAME CREATED BY',
            'Acaride',
            '',
            'SPECIAL THANKS TO',
            'Phaser 3 Framework',
            'OpenGameArt.org',
            'Kenney.nl',
            'Freesound.org'
        ];

        let yPos = 150;
        const creditTexts: Phaser.GameObjects.Text[] = [];

        credits.forEach(text => {
            const creditText = this.add.text(
                this.scale.width/2, 
                yPos, 
                text, 
                { 
                    fontFamily: 'Arial',
                    fontSize: text.includes('GAME') ? '32px' : '24px', 
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            ).setOrigin(0.5).setDepth(1);
            
            creditTexts.push(creditText);
            yPos += text ? 50 : 30;
        });

        this.currentDisplayGroup.addMultiple(creditTexts);

        // Переход к финальному меню через 6 секунд
        this.time.delayedCall(6000, () => {
            this.showFinalMenu();
        });
    }

    private showFinalMenu() {
        this.clearCurrentDisplay();

        // Заголовок
        const title = this.add.text(
            this.scale.width/2, 150, 
            'GAME CLEARED', 
            { 
                fontFamily: 'Arial',
                fontSize: '48px', 
                color: '#ffcc00',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(1);

        // Финальный счет
        const scoreText = this.add.text(
            this.scale.width/2, 230, 
            `FINAL SCORE: ${this.finalScore}`, 
            { 
                fontFamily: 'Arial',
                fontSize: '36px', 
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(1);

        // Пункты меню
        const saveItem = this.createMenuItem(350, 'SAVE RESULT', () => {
            if (LocalStorageManager.isScoreInTop(this.finalScore)) {
                this.scene.launch('InputScene', { 
                    score: this.finalScore, 
                    level: 'All'
                });
            } else {
                this.showMessage('Score too low for top 10');
            }
        });

        const menuItem = this.createMenuItem(450, 'MAIN MENU', () => {
            this.scene.start('MainMenu');
        });

        this.menuItems = [saveItem, menuItem];
        this.currentDisplayGroup.addMultiple([title, scoreText, saveItem, menuItem]);

        this.setupInput();
        this.selectMenuItem(0);
    }

    private createMenuItem(y: number, text: string, action: () => void): Phaser.GameObjects.Text {
        const menuItem = this.add.text(
            this.scale.width/2, 
            y, 
            text, 
            { 
                fontFamily: 'Arial',
                fontSize: '32px', 
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setInteractive().setDepth(1);

        menuItem.on('pointerover', () => {
            this.selectedItemIndex = this.menuItems.indexOf(menuItem);
            this.selectMenuItem(this.selectedItemIndex);
        });

        menuItem.on('pointerout', () => {
            menuItem.setColor('#ffffff');
        });

        menuItem.on('pointerdown', action);

        return menuItem;
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

    private clearCurrentDisplay() {
        // Удаляем все объекты из текущей группы отображения
        this.currentDisplayGroup.clear(true, true);
        this.menuItems = [];
        
        // Отключаем предыдущий ввод
        if (this.menuInput) {
            this.menuInput.cleanup();
        }
        this.input.off('pointermove');
    }

    private setupInput() {
        this.menuInput = new MenuInputComponent(this);
        
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

    private handleSelection() {
        if (this.menuInput.primaryActionIsDown) {
            this.menuItems[this.selectedItemIndex].emit('pointerdown');
        }
    }

    private changeSelectedItem(direction: number) {
        this.selectedItemIndex = (this.selectedItemIndex + direction + this.menuItems.length) % this.menuItems.length;
        this.selectMenuItem(this.selectedItemIndex);
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

        this.clearCurrentDisplay();
        if (this.overlay) {
            this.overlay.destroy();
        }
    }
}