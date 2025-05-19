import { CUSTOM_EVENTS } from '@/game/types/custom-events';
import { EventBusComponent } from '../../components/events/event-bus-component';
import * as CONFIG from '../../configs/game-config';
import Phaser from 'phaser';

// Тип для классов врагов
type EnemyType = 'ScoutEnemy' | 'FighterEnemy';

// Константа с очками за врагов
const ENEMY_SCORES: Record<EnemyType, number> = {
    ScoutEnemy: CONFIG.ENEMY_SCOUT_SCORE,
    FighterEnemy: CONFIG.ENEMY_FIGHTER_SCORE
};

export class Score extends Phaser.GameObjects.Text {
    private currentScore: number;
    private eventBusComponent: EventBusComponent;
    private isActive: boolean = true;

    constructor(scene: Phaser.Scene, eventBusComponent: EventBusComponent) {
        super(scene, scene.scale.width - 10, 10, '0', {
            fontSize: '24px',
            color: '#ff2f66',
            fontFamily: 'Arial',
            align: 'right'
        });

        this.currentScore = 0;
        this.eventBusComponent = eventBusComponent;

        // Добавление текста на сцену
        scene.add.existing(this);
        this.setOrigin(1, 0); // Выравнивание по правому верхнему углу

        // Инициализация счета в реестре
        scene.registry.set('score', this.currentScore);

        // Подписка на события
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Уничтожение врагов
        this.eventBusComponent.on(
            CUSTOM_EVENTS.ENEMY_DESTROYED, 
            (enemy: { constructor: { name: EnemyType } }) => {
                if (this.isActive) return;
                const enemyType = enemy.constructor.name as EnemyType;
                if (ENEMY_SCORES[enemyType]) {
                    this.addScore(ENEMY_SCORES[enemyType]);
                }
            }
        );

        // Попадание по врагам
        this.eventBusComponent.on(CUSTOM_EVENTS.ENEMY_HIT, () => {
            if (this.isActive) this.addScore(10);
        });
        

        this.eventBusComponent.on(CUSTOM_EVENTS.ADD_BONUS_SCORE, (bonus: number) => {
            if (this.isActive) this.addScore(bonus);
        });

        this.eventBusComponent.on(CUSTOM_EVENTS.ADD_SCORE, (value: number) => {
            if (this.isActive) this.addScore(value);
        });

    }

    private addScore(points: number): void {
        if (!this.isActive) return;
        try {
            this.currentScore += points;
            this.updateScoreText();
            this.scene.registry.set('score', this.currentScore);

            // Анимация при изменении счета
            this.scene.tweens.add({
                targets: this,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 100,
                yoyo: true
            }); 
        } catch (e) {
            console.log(e);
        }
    }

    private updateScoreText(): void {
        if (!this.active || !this.scene) return;
        this.setText(this.currentScore.toString());

        // Автоматическое уменьшение шрифта для больших чисел
        const scoreLength = this.currentScore.toString().length;
        if (scoreLength > 6) {
            this.setFontSize('18px');
        } else {
            this.setFontSize('24px');
        }        
    }

    public get score(): number {
        return this.currentScore;
    }

    public destroy(fromScene?: boolean): void {
        this.isActive = false;
        this.eventBusComponent.off(CUSTOM_EVENTS.ENEMY_DESTROYED);
        this.eventBusComponent.off(CUSTOM_EVENTS.SHIP_HIT);
        this.eventBusComponent.off(CUSTOM_EVENTS.ADD_BONUS_SCORE);
        if (this.scene) {
            this.scene.tweens.killTweensOf(this);
        }
        super.destroy(fromScene);
    }

    public resetScore(continueCount: number) {
        // Обнуляем счет + добавляем количество продолжений
        this.currentScore = continueCount;
        this.updateScoreText();
        if (this.scene) {
            this.scene.registry.set('score', this.currentScore);
        }
    }

}
