import Phaser from 'phaser';
import { LocalStorageManager } from '../managers/local-storage-manager';
import { RemoteStorageManager } from '../managers/remote-storage-manager';
import { HighScoreRecord } from '../types/interfaces';

export class InputScene extends Phaser.Scene {
    private inputText: Phaser.GameObjects.Text;
    private score: number;
    private level: number | 'All';
    private inputActive: boolean = true;
    private background: Phaser.GameObjects.Rectangle;
    private inputElements: Phaser.GameObjects.GameObject[] = [];
    private recordsElements: Phaser.GameObjects.GameObject[] = [];
    private showingRecords: boolean = false;

    constructor() {
        super({ key: 'InputScene' });
    }

    init(data: { score: number, level: number | 'All' }) {
        this.score = data.score;
        this.level = data.level;
    }

    create() {
        this.background = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8)
            .setOrigin(0)
            .setDepth(0);

        this.createInputUI();
    }

    private createInputUI() {
        this.clearInputElements();
        this.inputActive = true;
        this.showingRecords = false;

        const title = this.add.text(this.cameras.main.width / 2, 150, 'NEW HIGH SCORE!', {
            fontFamily: 'Arial',
            fontSize: '36px',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        const scoreText = this.add.text(this.cameras.main.width / 2, 200, `SCORE: ${this.score}`, {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        const prompt = this.add.text(this.cameras.main.width / 2, 280, 'ENTER YOUR NAME:', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.inputText = this.add.text(this.cameras.main.width / 2, 350, '', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffff00',
            backgroundColor: '#333333',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(0.5);

        const hint1 = this.add.text(
            this.cameras.main.width / 2, 
            400, 
            '(MAX 9 CHARACTERS, NO SPACES)', 
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#aaaaaa'
            }
        ).setOrigin(0.5);

        const hint2 = this.add.text(
            this.cameras.main.width / 2, 
            440, 
            'ESC TO CANCEL', 
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#ff5555'
            }
        ).setOrigin(0.5);

        this.inputElements = [title, scoreText, prompt, this.inputText, hint1, hint2];

        this.input.keyboard?.on('keydown', this.handleKeyInput, this);
    }

    private handleKeyInput(event: KeyboardEvent) {
        if (!this.inputActive) return;

        if (event.key === 'Escape') {
            this.cleanupAndClose();
            return;
        }

        if (this.showingRecords) {
            this.cleanupAndClose();
            return;
        }

        // Разрешаем только английские буквы, цифры и управляющие клавиши
        const allowedKeys = [
            'Enter', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 
            'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab'
        ];

        const isAllowedControlKey = allowedKeys.includes(event.key);
        const isLetter = /^[a-zA-Z]$/.test(event.key);
        const isNumber = /^[0-9]$/.test(event.key);

        if (event.key === 'Enter') {
            this.saveScore();
        } else if (event.key === 'Backspace') {
            this.inputText.text = this.inputText.text.slice(0, -1);
        } else if ((isLetter || isNumber || isAllowedControlKey) && 
                  this.inputText.text.length < 9) {
            // Для букв преобразуем в верхний регистр
            const charToAdd = isLetter ? event.key.toUpperCase() : event.key;
            this.inputText.text += charToAdd;
        }
    }

    private async saveScore() {
        const name = this.inputText.text || 'PLAYER';
        const entryName = name.substring(0, 9).replace(/\s/g, '');

        // Формируем новый рекорд
        const newScore = {
            name: entryName,
            score: this.score,
            level: this.level
        };

        // Добавляем локально
        const localUpdated = LocalStorageManager.addHighScore(newScore);

        // Если синхронизация включена, синхронизируем с сервером
        if (RemoteStorageManager.isSyncEnabled()) {
            try {
                // Отправляем новый рекорд на сервер, получаем обновлённый список с сервера
                const remoteScores = await RemoteStorageManager.addHighScore(newScore);

                if (remoteScores) {
                    // Объединяем локальные и серверные записи, сортируем и сохраняем локально и на сервере
                    const merged = this.mergeAndSortScores(localUpdated, remoteScores);
                    
                    // Сохраняем локально
                    LocalStorageManager.saveHighScores(merged);
                    await RemoteStorageManager.clearHighScores();
                    for (const score of merged) {
                        await RemoteStorageManager.addHighScore(score);
                    }

                }
            } catch (error) {
                console.error('Failed to sync high score:', error);
            }
        }

        this.inputActive = false;
        this.clearInputElements();
        this.showHighScores();
    }
    
    private mergeAndSortScores(
        localScores: HighScoreRecord[], 
        remoteScores: HighScoreRecord[]
    ): HighScoreRecord[] {
        // Объединяем массивы
        const combined = [...localScores, ...remoteScores];

        // Удаляем дубликаты по имени, уровню и очкам (если необходимо)
        const uniqueMap = new Map<string, HighScoreRecord>();

        for (const rec of combined) {
            // Ключ для уникальности: name + score + level
            const key = `${rec.name}_${rec.score}_${rec.level}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, rec);
            }
        }

        // Получаем уникальный массив
        const uniqueScores = Array.from(uniqueMap.values());

        // Сортируем по убыванию очков
        const sorted = uniqueScores.sort((a, b) => b.score - a.score);

        // Берём топ-10
        return sorted.slice(0, 10);
    }


    private showHighScores() {
        this.clearRecordsElements();
        this.showingRecords = true;

        const records = LocalStorageManager.loadHighScores();
        
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

        const continueText = this.add.text(
            this.cameras.main.width / 2, 
            450, 
            'PRESS ANY KEY TO CONTINUE', 
            {
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#00ff00',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);

        this.recordsElements.push(continueText);

        this.input.keyboard?.once('keydown', () => {
            this.cleanupAndClose();
        });
    }

    private clearInputElements() {
        this.inputElements.forEach(element => {
            if (element?.destroy) element.destroy();
        });
        this.inputElements = [];
        this.input.keyboard?.off('keydown', this.handleKeyInput);
    }

    private clearRecordsElements() {
        this.recordsElements.forEach(element => {
            if (element?.destroy) element.destroy();
        });
        this.recordsElements = [];
    }

    private cleanupAndClose() {
        this.clearInputElements();
        this.clearRecordsElements();
        
        if (this.background?.destroy) {
            this.background.destroy();
        }
        
        this.input.keyboard?.off('keydown');
        this.scene.stop();
    }

    shutdown() {
        this.cleanupAndClose();
    }
}