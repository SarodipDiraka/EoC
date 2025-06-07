import Phaser from 'phaser';
import { MenuInputComponent } from '../components/input/human/menu-input-component';
import { LocalStorageManager } from '../managers/local-storage-manager';
import { EventBus } from '../event-bus';
import { HighScoreRecord } from '../types/interfaces';
import { RemoteStorageManager } from '../managers/remote-storage-manager';

export class RecordsScene extends Phaser.Scene {
    private menuInput!: MenuInputComponent;
    private backButton!: Phaser.GameObjects.Text;
    private resetButton!: Phaser.GameObjects.Text;
    private recordsElements: Phaser.GameObjects.GameObject[] = [];
    private selectedButtonIndex: number = 0;
    private buttons: Phaser.GameObjects.Text[] = [];
    private lastInputTime = 0;
    private inputDelay = 200;

    constructor() {
        super('RecordsScene');
    }

    create() {
        const records = LocalStorageManager.loadHighScores();

        this.add.rectangle(0, 0, 50, 50, 0x000000)
            .setOrigin(0)
            .setDepth(1000);
        
        this.createBackground();
        this.createRecordsDisplay(records);
        this.createButtons();
        this.setupInput();

        EventBus.emit('current-scene-ready', this);
    }

    private createBackground() {
        this.add.image(0, 0, 'background')
            .setOrigin(0)
            .setScale(1.25);
    }

    private createRecordsDisplay(records: HighScoreRecord[]) {
        // Очищаем предыдущие элементы
        this.clearRecordsElements();

        // Заголовок таблицы
        const title = this.add.text(this.cameras.main.width / 2, 30, 'HIGH SCORES', {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        const rankHeader = this.add.text(20, 70, 'RANK', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff'
        });

        const nameHeader = this.add.text(80, 70, 'NAME', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff'
        });

        const scoreHeader = this.add.text(220, 70, 'SCORE', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff'
        });

        const levelHeader = this.add.text(360, 70, 'LVL', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff'
        });

        const dateHeader = this.add.text(400, 70, 'DATE', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff'
        });

        this.recordsElements.push(title, rankHeader, nameHeader, scoreHeader, levelHeader, dateHeader);

        records.forEach((record, index) => {
            const yPos = 100 + index * 30;
            
            const rankText = this.add.text(20, yPos, `${index + 1}.`, {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffffff'
            });
            
            const nameText = this.add.text(80, yPos, record.name, {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffff00'
            });
            
            const scoreText = this.add.text(220, yPos, record.score.toString(), {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffffff'
            });
            
            const levelText = this.add.text(360, yPos, 
                typeof record.level === 'number' ? record.level.toString() : 'All', 
                {
                    fontFamily: 'Arial',
                    fontSize: '16px',
                    color: '#aaaaaa'
                }
            );

            const date = new Date(record.date);
            const dateText = this.add.text(400, yPos, 
                `${date.getDate()}.${date.getMonth()+1}.${date.getFullYear()}`,
                {
                    fontFamily: 'Arial',
                    fontSize: '16px',
                    color: '#aaaaaa'
                }
            );

            this.recordsElements.push(rankText, nameText, scoreText, levelText, dateText);
        });
    }

    private createButtons() {
        this.buttons = [];

        // Кнопка возврата
        this.backButton = this.add.text(
            this.cameras.main.width / 2 - 150, 
            550, 
            'BACK', 
            { 
                fontFamily: 'Arial', 
                fontSize: '32px', 
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setInteractive();

        // Кнопка сброса рекордов
        this.resetButton = this.add.text(
            this.cameras.main.width / 2 + 100, 
            550, 
            'RESET SCORES', 
            { 
                fontFamily: 'Arial', 
                fontSize: '32px', 
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setInteractive();

        this.buttons.push(this.backButton, this.resetButton);

        // Обработчики для кнопки BACK
        this.backButton.on('pointerover', () => {
            this.selectedButtonIndex = 0;
            this.updateButtonSelection();
        });

        this.backButton.on('pointerout', () => {
            this.updateButtonSelection();
        });

        this.backButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });

        // Обработчики для кнопки RESET
        this.resetButton.on('pointerover', () => {
            this.selectedButtonIndex = 1;
            this.updateButtonSelection();
        });

        this.resetButton.on('pointerout', () => {
            this.updateButtonSelection();
        });

        this.resetButton.on('pointerdown', () => {
            this.resetHighScores();
        });

        this.updateButtonSelection();
    }

    private async resetHighScores() {
        LocalStorageManager.saveHighScores(LocalStorageManager.loadHighScores().map((_, i) => ({
            name: `NoEntry`,
            score: (10 - i) * 1000,
            level: (10 - i) >= 3 ? 'All' : (10 - i) as number,
            date: new Date(Date.now() - (i * 86400000)).toISOString()
        })));

        if (RemoteStorageManager.isSyncEnabled()) {
            try {
                await RemoteStorageManager.clearHighScores();
                const localScores = LocalStorageManager.loadHighScores();
                for (const score of localScores) {
                    await RemoteStorageManager.addHighScore(score);
                }
            } catch (error) {
                console.error('Ошибка при очистке серверных рекордов', error);
                return;
            }
        }
        
        this.createRecordsDisplay(LocalStorageManager.loadHighScores());
        this.showMessage('Scores reset to default');
    }

    private showMessage(text: string) {
        const message = this.add.text(
            this.cameras.main.width / 2,
            500,
            text,
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#00ff00'
            }
        ).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => {
            message.destroy();
        });
    }

    private updateButtonSelection() {
        this.buttons.forEach((button, index) => {
            button.setColor(index === this.selectedButtonIndex ? '#ff0' : '#fff');
            button.setScale(index === this.selectedButtonIndex ? 1.1 : 1.0);
        });
    }

    private setupInput() {
        this.menuInput = new MenuInputComponent(this);

        this.backButton.on('pointerover', () => {
            this.selectedButtonIndex = 0;
            this.updateButtonSelection();
        });

        this.resetButton.on('pointerover', () => {
            this.selectedButtonIndex = 1;
            this.updateButtonSelection();
        });
    }

    private clearRecordsElements() {
        this.recordsElements.forEach(element => {
            if (element?.destroy) element.destroy();
        });
        this.recordsElements = [];
    }

    update(time: number) {
        if (!this.menuInput) return;

        this.menuInput.update();

        if (time - this.lastInputTime >= this.inputDelay) {
            if (this.menuInput.leftIsDown) {
                this.selectedButtonIndex = (this.selectedButtonIndex - 1 + this.buttons.length) % this.buttons.length;
                this.updateButtonSelection();
                this.lastInputTime = time;
            } else if (this.menuInput.rightIsDown) {
                this.selectedButtonIndex = (this.selectedButtonIndex + 1) % this.buttons.length;
                this.updateButtonSelection();
                this.lastInputTime = time;
            }
        }


        if (this.menuInput.primaryActionIsDown) {
            this.buttons[this.selectedButtonIndex].emit('pointerdown');
        }

        if (this.menuInput.secondaryActionIsDown) {
            // Возврат в главное меню
            this.scene.start('MainMenu');
        }
    }

    shutdown() {
        this.menuInput.cleanup();
        this.clearRecordsElements();
        this.input.keyboard?.off('keydown');
    }
}