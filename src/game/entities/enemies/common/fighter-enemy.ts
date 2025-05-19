import Phaser from 'phaser';
import { BotFighterInputComponent } from '../../../components/input/ai/common/bot-fighter-input-component';
import { VerticalMovementComponent } from '../../../components/movement/vertical-movement-component';
import { BulletSpawnerComponent } from '../../../components/weapon/bullet-spawner-component';
import { EventBusComponent } from '../../../components/events/event-bus-component';
import * as CONFIG from '../../../configs/game-config';
import { BaseEnemy } from '../base-enemy';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';

export class FighterEnemy extends BaseEnemy {
    static enemyType = 'fighter';
    private _inputComponent!: BotFighterInputComponent;
    private _verticalMovementComponent!: VerticalMovementComponent;
    private _shipSprite!: Phaser.GameObjects.Sprite;
    private _engineSprite!: Phaser.GameObjects.Sprite;
    private _lastFireTime = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.initSprites();
    }

    init(eventBus: EventBusComponent): void {
        super.init(eventBus);
        
        this._inputComponent = new BotFighterInputComponent();
        this._verticalMovementComponent = new VerticalMovementComponent(
            this,
            this._inputComponent,
            CONFIG.ENEMY_FIGHTER_MOVEMENT_VERTICAL_VELOCITY
        );
        
        this._bulletSpawner = new BulletSpawnerComponent(
            this.scene,
            this,
            'bullet',
            CONFIG.ENEMY_FIGHTER_BULLET_MAX_COUNT
        );

        this._dropConfig = {
            items: [
                { type: 'POWER', chance: 0.7 },
                { type: 'SCORE', chance: 0.3 }
            ]
        };

        eventBus.emit(CUSTOM_EVENTS.ENEMY_INIT, this);
    }

    protected initSprites(): void {
        this._shipSprite = this.scene.add.sprite(0, 0, 'fighter', 0);
        this._engineSprite = this.scene.add.sprite(0, 0, 'fighter_engine')
            .setFlipY(true)
            .play('fighter_engine');
        
        this.add([this._engineSprite, this._shipSprite]);
    }

    get shipAssetKey(): string { return 'fighter'; }
    get shipDestroyedAnimationKey(): string { return 'fighter_destroy'; }

    reset(): void {
        super.reset();
        this._verticalMovementComponent.reset();
        this._engineSprite.setVisible(true);
        this._lastFireTime = 0;
    }

    protected getInitialHealth(): number {
        return CONFIG.ENEMY_FIGHTER_HEALTH;
    }

    protected customUpdate(time: number, delta: number): void {
        this._inputComponent.update();
        this._verticalMovementComponent.update();
        
        // Логика стрельбы
        if (time - this._lastFireTime >= CONFIG.ENEMY_FIGHTER_BULLET_INTERVAL) {
            this.fireBullet();
            this._lastFireTime = time;
        }
    }

    private fireBullet(): void {
        this._bulletSpawner?.spawn({
            directions: [new Phaser.Math.Vector2(0, -1)],
            speed: CONFIG.ENEMY_FIGHTER_BULLET_SPEED,
            lifespan: CONFIG.ENEMY_FIGHTER_BULLET_LIFESPAN,
            size: { width: 14, height: 18 },
            animationKey: 'bullet',
            flipY: true,
            scale: 0.8,
            spawnPosition: { 
                x: this.x, 
                y: this.y + 10
            }
        });

        this._eventBusComponent.emit(CUSTOM_EVENTS.SHIP_SHOOT);
    }

    destroy(fromScene?: boolean): void {
        if (this._bulletSpawner) {
            this._bulletSpawner.cleanup();
        }
        this._engineSprite.destroy(fromScene);
        super.destroy(fromScene);
    }
}