import { CUSTOM_EVENTS } from '@/game/types/custom-events';
import { EventBusComponent } from '../../components/events/event-bus-component';
import * as CONFIG from '../../configs/game-config';
import Phaser from 'phaser';

export class Lives extends Phaser.GameObjects.Container {
    private currentLives: number;
    private eventBusComponent: EventBusComponent;
    private livesIcons: Phaser.GameObjects.Image[] = [];

    constructor(scene: Phaser.Scene, eventBusComponent: EventBusComponent) {
        super(scene, 5, scene.scale.height - 30);
        
        this.currentLives = CONFIG.PLAYER_LIVES;
        this.eventBusComponent = eventBusComponent;
        
        scene.add.existing(this);
        this.createLivesIcons();
        this.setupEventListeners();
        
        // Первый спавн игрока
        this.eventBusComponent.emit(CUSTOM_EVENTS.PLAYER_SPAWN);
    }

    private createLivesIcons(): void {
        this.livesIcons.forEach(icon => icon.destroy());
        this.livesIcons = [];
        this.removeAll(true);

        for (let i = 0; i < this.currentLives; i++) {
            const shipIcon = this.scene.add.image(i * 20, 0, 'ship')
                .setScale(0.6)
                .setOrigin(0);
            this.add(shipIcon);
            this.livesIcons.push(shipIcon);
        }
    }

    private setupEventListeners(): void {
        this.eventBusComponent.on(CUSTOM_EVENTS.PLAYER_DESTROYED, () => {
            this.handlePlayerDestroyed();
        });
        this.eventBusComponent.on(CUSTOM_EVENTS.ADD_LIFE, () => {
            this.currentLives = this.currentLives + 1;
            this.createLivesIcons();
        });
    }

    private handlePlayerDestroyed(): void {
        this.currentLives--;
        
        // Уничтожение иконки жизни
        if (this.livesIcons[this.currentLives]) {
            this.livesIcons[this.currentLives].destroy();
        }

        if (this.currentLives > 0) {
            // Респавн игрока с задержкой
            this.scene.time.delayedCall(1500, () => {
                this.eventBusComponent.emit(CUSTOM_EVENTS.PLAYER_SPAWN);
            });
            return;
        }

        // Game Over
        this.scene.time.delayedCall(1000, () => {
            this.eventBusComponent.emit(CUSTOM_EVENTS.GAME_OVER);
        });
    }

    public get livesCount(): number {
        return this.currentLives;
    }

    public destroy(fromScene?: boolean): void {
        this.eventBusComponent.off(CUSTOM_EVENTS.PLAYER_DESTROYED);
        this.eventBusComponent.off(CUSTOM_EVENTS.ADD_LIFE);
        super.destroy(fromScene);
    }

    public resetLives() {
        // Удаляем все текущие иконки жизней
        this.livesIcons.forEach(icon => icon.destroy());
        this.livesIcons = [];
        
        // Восстанавливаем начальное количество жизней
        this.currentLives = CONFIG.PLAYER_LIVES;
        
        // Создаем новые иконки
        this.createLivesIcons();
    }

}
