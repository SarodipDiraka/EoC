import { BaseItem } from './base-item';
import { Player } from '../player';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';
import { GraphicsUtils } from '@/game/utils/graphics-utils';

export class ScoreItem extends BaseItem {
    private scoreValue: number = 100;

    protected createGraphics(): Phaser.GameObjects.Graphics {
        return GraphicsUtils.createScoreItem(this.scene, 0, 0);
    }

    protected getColliderWidth(): number {
        return 16;
    }
    protected getColliderHeight(): number {
        return 16;
    }

    onCollect(player: Player): void {
        this.eventBus.emit(CUSTOM_EVENTS.ADD_SCORE, this.scoreValue);
        this.destroy();
    }
}