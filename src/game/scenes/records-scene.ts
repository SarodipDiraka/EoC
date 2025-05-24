import Phaser from 'phaser';
import { MenuInputComponent } from '../components/input/human/menu-input-component';
import { LocalStorageManager } from '../managers/local-storage-manager';
import { EventBus } from '../event-bus';
import { HighScoreRecord } from '../types/interfaces';

export class RecordsScene extends Phaser.Scene {
    private menuInput!: MenuInputComponent;
    private backButton!: Phaser.GameObjects.Text;
    private recordsText!: Phaser.GameObjects.Text;

    constructor() {
        super('RecordsScene');
    }

    create() {
        const records = LocalStorageManager.loadHighScores();
        
        this.createBackground();
        this.createTitle();
        this.createRecordsDisplay(records);
        this.createBackButton();
        this.setupInput();

        EventBus.emit('current-scene-ready', this);
    }

    private createBackground() {
        this.add.image(0, 0, 'background')
            .setOrigin(0)
            .setScale(1.25);
    }

    private createTitle() {
        this.add.text(
            this.cameras.main.width / 2, 
            100, 
            'HIGH SCORES', 
            { 
                fontFamily: 'Arial', 
                fontSize: '48px', 
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
    }

    private createRecordsDisplay(records: HighScoreRecord[]) {
        const recordsText = records.map((record, index) => {
            const date = new Date(record.date).toLocaleDateString();
            const level = record.level === 'All' ? 'All' : `Lvl:${record.level}`;
            return `${index + 1}. ${record.name.padEnd(10)} ${record.score.toString().padStart(8)} ${level} ${date}`;
        }).join('\n');

        this.recordsText = this.add.text(
            this.cameras.main.width / 2,
            200,
            recordsText,
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#ffffff',
                align: 'left',
                lineSpacing: 10
            }
        ).setOrigin(0.5, 0);
    }

    private createBackButton() {
        this.backButton = this.add.text(
            this.cameras.main.width / 2, 
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

        this.backButton.on('pointerover', () => {
            this.backButton.setColor('#ff0');
            this.backButton.setScale(1.1);
        });

        this.backButton.on('pointerout', () => {
            this.backButton.setColor('#ffffff');
            this.backButton.setScale(1.0);
        });

        this.backButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }

    private setupInput() {
        this.menuInput = new MenuInputComponent(this);
    }

    update() {
        if (!this.menuInput) return;

        this.menuInput.update();

        if (this.menuInput.primaryActionIsDown || this.menuInput.secondaryActionIsDown) {
            this.backButton.emit('pointerdown');
        }
    }

    shutdown() {
        this.menuInput.cleanup();
    }
}