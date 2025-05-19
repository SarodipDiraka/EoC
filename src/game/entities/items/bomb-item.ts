import { BaseItem } from './base-item';
import { Player } from '../player';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';
import { GraphicsUtils } from '@/game/utils/graphics-utils';

export class BombItem extends BaseItem {
    private bombValue: number = 1;

    protected createGraphics(): Phaser.GameObjects.Graphics {
        return GraphicsUtils.createBombItem(this.scene, 0, 0);
    }

    protected getColliderWidth(): number {
        return 32;
    }
    protected getColliderHeight(): number {
        return 32;
    }

    onCollect(player: Player): void {
        this.eventBus.emit(CUSTOM_EVENTS.ADD_BOMB, this.bombValue);
        this.destroy();
    }
}