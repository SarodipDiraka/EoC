import Phaser from 'phaser';
import { BotScoutInputComponent } from '../../../components/input/ai/common/bot-scout-input-component';
import { HorizontalMovementComponent } from '../../../components/movement/horizontal-movement-component';
import { VerticalMovementComponent } from '../../../components/movement/vertical-movement-component';
import { EventBusComponent } from '../../../components/events/event-bus-component';
import * as CONFIG from '../../../configs/game-config';
import { BaseEnemy } from '../base-enemy';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';

export class ScoutEnemy extends BaseEnemy {
    static enemyType = 'scout';
    private _inputComponent!: BotScoutInputComponent;
    private _horizontalMovementComponent!: HorizontalMovementComponent;
    private _verticalMovementComponent!: VerticalMovementComponent;
    private _shipSprite!: Phaser.GameObjects.Sprite;
    private _engineSprite!: Phaser.GameObjects.Sprite;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.initSprites();
        this._dropConfig = {
            items: [
                { type: 'POWER', chance: 0.6 },
                { type: 'SCORE', chance: 0.3 }
            ]
        };
    }

    init(eventBus: EventBusComponent): void {
        super.init(eventBus);
        
        this._inputComponent = new BotScoutInputComponent(this);
        this._horizontalMovementComponent = new HorizontalMovementComponent(
            this,
            this._inputComponent,
            CONFIG.ENEMY_SCOUT_MOVEMENT_HORIZONTAL_VELOCITY
        );
        this._verticalMovementComponent = new VerticalMovementComponent(
            this,
            this._inputComponent,
            CONFIG.ENEMY_SCOUT_MOVEMENT_VERTICAL_VELOCITY
        );

        eventBus.emit(CUSTOM_EVENTS.ENEMY_INIT, this);
    }

    protected initSprites(): void {
        this._shipSprite = this.scene.add.sprite(0, 0, 'scout', 0);
        this._engineSprite = this.scene.add.sprite(0, 0, 'scout_engine')
            .setFlipY(true)
            .play('scout_engine');
        
        this.add([this._engineSprite, this._shipSprite]);
    }

    get shipAssetKey(): string { return  'scout'; }
    get shipDestroyedAnimationKey(): string { return  'scout_destroy'; }

    reset(): void {
        super.reset();
        this._inputComponent.setStartX(this.x);
        this._verticalMovementComponent.reset();
        this._horizontalMovementComponent.reset();
        this._engineSprite.setVisible(true);
    }

    protected getInitialHealth(): number {
        return CONFIG.ENEMY_SCOUT_HEALTH;
    }

    protected customUpdate(time: number, delta: number): void {
        this._inputComponent.update();
        this._horizontalMovementComponent.update();
        this._verticalMovementComponent.update();
    }

    destroy(fromScene?: boolean): void {
        this._engineSprite.destroy(fromScene);
        super.destroy(fromScene);
    }
}
