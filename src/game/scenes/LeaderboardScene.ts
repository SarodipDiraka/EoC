import Phaser from 'phaser';
import { MenuInputComponent } from '../components/input/human/menu-input-component';
import { RemoteStorageManager } from '../managers/remote-storage-manager';
import { HighScoreRecord } from '../types/interfaces';

export class LeaderboardScene extends Phaser.Scene {
    private loadingText!: Phaser.GameObjects.Text;
    private loadingDotCount = 0;
    private loadingTimer?: Phaser.Time.TimerEvent;

    private recordsElements: Phaser.GameObjects.GameObject[] = [];
    private menuInput!: MenuInputComponent;
    private backButton!: Phaser.GameObjects.Text;
    private buttons: Phaser.GameObjects.Text[] = [];
    private selectedButtonIndex = 0;
    private lastInputTime = 0;
    private inputDelay = 200;

    constructor() {
        super('LeaderboardScene');
    }

    create() {
        this.createBackground();
        this.createLoadingAnimation();
        this.add.rectangle(0, 0, 50, 50, 0x000000)
            .setOrigin(0)
            .setDepth(1000);

        this.loadRecords();
    }

    private createLoadingAnimation() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.loadingText = this.add.text(centerX, centerY, 'Loading', {
            fontFamily: 'Arial',
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Запускаем таймер, который будет обновлять количество точек после слова Loading
        this.loadingTimer = this.time.addEvent({
            delay: 100,
            loop: true,
            callback: () => {
                this.loadingDotCount = (this.loadingDotCount + 1) % 4; // 0..3 точек
                this.loadingText.setText('Loading' + '.'.repeat(this.loadingDotCount));
            }
        });
    }

    private async loadRecords() {
        const records = await RemoteStorageManager.loadGlobalLeaderboard() || [];

        // Останавливаем анимацию
        if (this.loadingTimer) {
            this.loadingTimer.remove(false);
        }

        // Удаляем текст загрузки
        if (this.loadingText) {
            this.loadingText.destroy();
        }

        // Показываем данные и интерфейс
        this.createRecordsDisplay(records);
        this.createButtons();
        this.setupInput();

        this.events.emit('current-scene-ready', this);
    }

    private createBackground() {
        this.add.image(0, 0, 'background')
            .setOrigin(0)
            .setScale(1.25);
    }

    private createRecordsDisplay(records: HighScoreRecord[]) {
        this.clearRecordsElements();

        const title = this.add.text(this.cameras.main.width / 2, 30, 'GLOBAL LEADERBOARD', {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#00ccff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        const rankHeader = this.add.text(20, 70, 'RANK', { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff' });
        const nameHeader = this.add.text(80, 70, 'NAME', { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff' });
        const scoreHeader = this.add.text(220, 70, 'SCORE', { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff' });
        const levelHeader = this.add.text(360, 70, 'LVL', { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff' });
        const dateHeader = this.add.text(400, 70, 'DATE', { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff' });

        this.recordsElements.push(title, rankHeader, nameHeader, scoreHeader, levelHeader, dateHeader);

        records.forEach((record, index) => {
            const yPos = 100 + index * 30;

            const rankText = this.add.text(20, yPos, `${index + 1}.`, { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff' });
            const nameText = this.add.text(80, yPos, record.name, { fontFamily: 'Arial', fontSize: '16px', color: '#ffff00' });
            const scoreText = this.add.text(220, yPos, record.score.toString(), { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff' });
            const levelText = this.add.text(360, yPos, (typeof record.level === 'number' ? record.level.toString() : 'All'), { fontFamily: 'Arial', fontSize: '16px', color: '#aaaaaa' });
            const date = new Date(record.date);
            const dateText = this.add.text(400, yPos, `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`, { fontFamily: 'Arial', fontSize: '16px', color: '#aaaaaa' });

            this.recordsElements.push(rankText, nameText, scoreText, levelText, dateText);
        });
    }

    private createButtons() {
        this.buttons = [];

        this.backButton = this.add.text(this.cameras.main.width / 2, 550, 'BACK', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setInteractive();

        this.buttons.push(this.backButton);

        this.backButton.on('pointerover', () => {
            this.selectedButtonIndex = 0;
            this.updateButtonSelection();
        });

        this.backButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });

        this.updateButtonSelection();
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
    }

    private clearRecordsElements() {
        this.recordsElements.forEach(el => {
            if (el?.destroy) el.destroy();
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
            this.scene.start('MainMenu');
        }
    }

    shutdown() {
        this.menuInput.cleanup();
        this.clearRecordsElements();
        this.input.keyboard?.off('keydown');
        if (this.loadingTimer) {
            this.loadingTimer.remove(false);
        }
    }
}



