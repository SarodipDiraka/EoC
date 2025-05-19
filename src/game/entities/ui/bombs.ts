import { CUSTOM_EVENTS } from '@/game/types/custom-events';
import * as CONFIG from '../../configs/game-config';
import Phaser from 'phaser';
import { EventBusComponent } from '@/game/components/events/event-bus-component';
import { GraphicsUtils } from '@/game/utils/graphics-utils';

export class Bombs extends Phaser.GameObjects.Container {
    private bombIcons: Phaser.GameObjects.Graphics[] = [];
    private eventBus: EventBusComponent;

    constructor(scene: Phaser.Scene, eventBus: EventBusComponent) {
        super(scene, 5, scene.scale.height - 60);
        this.eventBus = eventBus;
        scene.add.existing(this);
        
        this.createBombIcons();
        this.setupEventListeners();
    }

    private createBombIcons(): void {
        this.bombIcons.forEach(icon => icon.destroy());
        this.bombIcons = [];
        this.removeAll(true);

        for (let i = 0; i < CONFIG.PLAYER_BOMB_CONFIG.count; i++) {
            const bombIcon = GraphicsUtils.createBombIcon(this.scene, i * 25 + 10, 10);
            this.add(bombIcon);
            this.bombIcons.push(bombIcon);
        }
    }

    private setupEventListeners(): void {
        this.eventBus.on(CUSTOM_EVENTS.BOMB_COUNT_CHANGED, (count: number) => {
            this.updateBombIcons(count);
        });
    }

    private updateBombIcons(count: number): void {
        while (this.bombIcons.length > count) {
            const icon = this.bombIcons.pop();
            icon?.destroy();
        }
        
        while (this.bombIcons.length < count) {
            const newIndex = this.bombIcons.length;
            const bombIcon = GraphicsUtils.createBombIcon(this.scene, newIndex * 25 + 10, 10);
            this.add(bombIcon);
            this.bombIcons.push(bombIcon);
        }
    }

    public destroy(fromScene?: boolean): void {
        this.eventBus.off(CUSTOM_EVENTS.BOMB_COUNT_CHANGED);
        this.bombIcons.forEach(icon => icon.destroy());
        super.destroy(fromScene);
    }
}