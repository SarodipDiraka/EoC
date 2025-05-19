import { BaseItem } from './base-item';
import { Player } from '../player';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';
import { GraphicsUtils } from '@/game/utils/graphics-utils';

export class HealthItem extends BaseItem {
    private healthValue: number = 1;

    protected createGraphics(): Phaser.GameObjects.Graphics {
        return GraphicsUtils.createHealthItem(this.scene, 0, 0);
    }

    protected getColliderWidth(): number {
        return 32;
    }
    protected getColliderHeight(): number {
        return 32;
    }

    onCollect(player: Player): void {
        this.eventBus.emit(CUSTOM_EVENTS.ADD_LIFE, this.healthValue);
        this.destroy();
    }
}