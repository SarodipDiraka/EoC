import Phaser from 'phaser';
import { CUSTOM_EVENTS } from '../types/custom-events';
import * as CONFIG from '../configs/game-config';
import { EventBus } from '../event-bus';

export class LevelCompleteScene extends Phaser.Scene {
    private levelBonus = 0;
    private currentLevel = 0;

    constructor() {
        super({ key: 'LevelComplete' });
    }

    init(data: { level: number, lives: number }) {
        this.currentLevel = data.level;
        this.levelBonus = data.lives * CONFIG.LIFE_BONUS_VALUE;
    }

    create() {
        // Затемнение фона
        const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000).setOrigin(0);

        // Текст "STAGE COMPLETE"
        const completeText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 50,
            'STAGE COMPLETE',
            { fontSize: '48px', color: '#ffffff' }
        ).setOrigin(0.5).setDepth(11);

        // Текст бонуса
        const bonusText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 20,
            'LIFE BONUS',
            { fontSize: '32px', color: '#ffffff' }
        ).setOrigin(0.5).setAlpha(0).setDepth(11);

        // Число бонуса
        const bonusValue = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 60,
            this.levelBonus.toString(),
            { fontSize: '40px', color: '#ffcc00' }
        ).setOrigin(0.5).setAlpha(0).setDepth(11);

        // Анимация появления текста
        this.tweens.add({
            targets: bonusText,
            alpha: 1,
            duration: 1000,
            delay: 1000,
            onComplete: () => {
                this.tweens.add({
                    targets: bonusValue,
                    alpha: 1,
                    duration: 800,
                    onComplete: () => {
                        // Обновляем счет
                        EventBus.emit(
                            CUSTOM_EVENTS.ADD_BONUS_SCORE, 
                            this.levelBonus
                        );
                        
                        // Переход к следующему уровню через 5 секунд
                        this.time.delayedCall(5000, () => {
                            this.scene.stop();
                            this.scene.get('GameScene').events.emit('level-transition', this.currentLevel);
                        });
                    }
                });
            }
        });
    }
}